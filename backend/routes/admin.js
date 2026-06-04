const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [
      total, pending, users, funding, recentProjects, recentActivity,
      sectorStats, statusStats, trlStats, districtStats, provinceStats, topInvestors
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM projects'),
      pool.query("SELECT COUNT(*) FROM projects WHERE status = 'under_review'"),
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query("SELECT COALESCE(SUM(total_cost),0) AS total FROM projects WHERE status != 'draft'"),
      pool.query(`
        SELECT p.id, p.title, p.primary_sector, p.status, p.total_cost, p.created_at,
               u.first_name || ' ' || u.last_name AS submitter
        FROM projects p LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC LIMIT 5
      `),
      pool.query(`
        SELECT * FROM (
          SELECT 'project_approved' AS type, title AS description, created_at FROM projects WHERE status = 'approved'
          UNION ALL
          SELECT 'user_registered', first_name || ' ' || last_name, created_at FROM users
        ) activity ORDER BY created_at DESC LIMIT 10
      `),
      // By Sector — counts all statuses so the card is populated regardless of import status
      pool.query(`
        SELECT primary_sector, COUNT(*) AS count
        FROM projects WHERE primary_sector IS NOT NULL
        GROUP BY primary_sector ORDER BY count DESC
      `),
      // By Status — drives the By Status card and the A2 lifecycle breakdown
      pool.query(`
        SELECT status, COUNT(*) AS count
        FROM projects GROUP BY status ORDER BY count DESC
      `),
      // TRL distribution
      pool.query(`
        SELECT trl_level, COUNT(*) AS count
        FROM projects WHERE trl_level IS NOT NULL
        GROUP BY trl_level ORDER BY trl_level
      `),
      // By District (top 10)
      pool.query(`
        SELECT district, COUNT(*) AS count, COALESCE(SUM(total_cost),0) AS total
        FROM projects WHERE district IS NOT NULL
        GROUP BY district ORDER BY count DESC LIMIT 10
      `),
      // By Province — clean dimension for the bulk-imported projects.
      // NULLs (older pre-import projects) are bucketed as 'Unspecified' so the
      // totals still sum to the full project count instead of being hidden.
      pool.query(`
        SELECT COALESCE(province, 'Unspecified') AS province,
               COUNT(*) AS count, COALESCE(SUM(total_cost),0) AS total
        FROM projects
        GROUP BY COALESCE(province, 'Unspecified') ORDER BY count DESC
      `),
      // Top Investors — interests.user_id is the real column (not investor_id)
      pool.query(`
        SELECT u.id, u.first_name, u.last_name, u.organization,
               COUNT(i.id) AS interests,
               COALESCE(MAX(i.investment_range_max),0) AS max_investment
        FROM interests i JOIN users u ON i.user_id = u.id
        GROUP BY u.id, u.first_name, u.last_name, u.organization
        ORDER BY interests DESC LIMIT 10
      `)
    ]);

    res.json({
      total_projects: parseInt(total.rows[0].count),
      pending_review: parseInt(pending.rows[0].count),
      total_users: parseInt(users.rows[0].count),
      total_funding: parseInt(funding.rows[0].total),
      recent_projects: recentProjects.rows,
      recent_activity: recentActivity.rows,
      sector_stats: sectorStats.rows,
      status_stats: statusStats.rows,
      trl_stats: trlStats.rows,
      district_stats: districtStats.rows,
      province_stats: provinceStats.rows,
      top_investors: topInvestors.rows,
      top_sectors: sectorStats.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET pending review projects
router.get('/pending', async (req, res) => {
  try {
    const { priority, sort = 'created_at' } = req.query;
    let query = `
      SELECT p.*, u.first_name || ' ' || u.last_name AS submitter_name, u.email AS submitter_email
      FROM projects p LEFT JOIN users u ON p.user_id = u.id
      WHERE p.status = 'under_review'
    `;
    const params = [];
    if (priority) { query += ` AND p.priority_level = $1`; params.push(priority); }
    query += ` ORDER BY p.${sort === 'priority' ? 'priority_level' : 'created_at'} ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending projects' });
  }
});

// Review action (approve/reject/request changes)
router.put('/projects/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;

    const validActions = { approve: 'approved', reject: 'rejected', request_changes: 'changes_requested' };
    if (!validActions[action]) return res.status(400).json({ error: 'Invalid action' });

    const result = await pool.query(`
      UPDATE projects SET status = $1, admin_notes = $2, updated_at = NOW()
      WHERE id = $3 RETURNING *, (SELECT user_id FROM projects WHERE id = $3) AS user_id
    `, [validActions[action], notes, id]);

    if (!result.rows[0]) return res.status(404).json({ error: 'Project not found' });

    // Notify owner
    const messages = {
      approve: { title: 'Project approved', msg: `Your project "${result.rows[0].title}" has been approved and is now live.`, type: 'success' },
      reject: { title: 'Project Review Update', msg: `Your project "${result.rows[0].title}" was not approved. Notes: ${notes}`, type: 'error' },
      request_changes: { title: 'Changes Requested', msg: `Please review and update your project "${result.rows[0].title}". Notes: ${notes}`, type: 'warning' }
    };

    await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1,$2,$3,$4,$5)
    `, [result.rows[0].user_id, messages[action].title, messages[action].msg, messages[action].type, '/dashboard/projects']);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process review' });
  }
});

// Valid project status values (DB enum)
const VALID_STATUSES = [
  'draft', 'under_review', 'approved', 'rejected',
  'changes_requested', 'under_implementation', 'completed', 'archived'
];

const PROJECT_SORT_COLUMNS = {
  created_at: 'p.created_at',
  total_cost: 'p.total_cost',
  province: 'p.province',
  primary_sector: 'p.primary_sector',
  status: 'p.status',
};

const projectOrderBy = (sortBy = 'created_at', sortDir = 'desc') => {
  const column = PROJECT_SORT_COLUMNS[sortBy] || PROJECT_SORT_COLUMNS.created_at;
  const direction = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return `${column} ${direction} NULLS LAST, p.created_at DESC`;
};

// Change a single project's status (powers the inline Approve/Archive buttons)
router.put('/projects/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const result = await pool.query(
      `UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Project not found' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change project status' });
  }
});

// Bulk status change for selected projects (bulk approve / archive / etc.)
router.put('/projects/bulk-status', async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No projects selected' });
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const result = await pool.query(
      `UPDATE projects SET status = $1, updated_at = NOW() WHERE id = ANY($2::uuid[]) RETURNING id`,
      [status, ids]
    );

    res.json({ updated: result.rowCount, ids: result.rows.map(r => r.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to bulk update projects' });
  }
});

// GET a single project with admin-only review context for the All Projects drawer
router.get('/projects/:id/detail', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*,
             u.first_name || ' ' || u.last_name AS owner_name,
             u.email AS owner_email,
             u.phone AS owner_phone,
             u.role AS owner_role,
             COALESCE((SELECT COUNT(*) FROM interests i WHERE i.project_id = p.id), 0)::int AS interest_count,
             COALESCE((SELECT COUNT(*) FROM project_documents d WHERE d.project_id = p.id), 0)::int AS document_count,
             COALESCE((SELECT COUNT(*) FROM project_updates pu WHERE pu.project_id = p.id), 0)::int AS update_count
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [id]);

    if (!result.rows[0]) return res.status(404).json({ error: 'Project not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project detail' });
  }
});

// GET all projects (admin)
router.get('/projects', async (req, res) => {
  try {
    const { status, sector, province, district, search, sort_by = 'created_at', sort_dir = 'desc', page = 1, limit = 15 } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status && status !== 'all') { conditions.push(`p.status = $${idx++}`); params.push(status); }
    if (sector) { conditions.push(`p.primary_sector = $${idx++}`); params.push(sector); }
    if (province) { conditions.push(`p.province = $${idx++}`); params.push(province); }
    if (district) { conditions.push(`p.district = $${idx++}`); params.push(district); }
    if (search) {
      conditions.push(`(p.title ILIKE $${idx} OR p.organization_name ILIKE $${idx} OR p.primary_sector ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const orderBy = projectOrderBy(sort_by, sort_dir);

    const [projects, count] = await Promise.all([
      pool.query(`
        SELECT p.id, p.project_code, p.title, p.primary_sector, p.province, p.district, p.status,
               p.total_cost, p.trl_level, p.created_at, p.priority_level, p.risk_level, p.organization_name,
               u.first_name || ' ' || u.last_name AS owner_name, u.email AS owner_email
        FROM projects p LEFT JOIN users u ON p.user_id = u.id
        ${where} ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}
      `, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM projects p ${where}`, params)
    ]);

    const statusCounts = await pool.query(`
      SELECT status, COUNT(*) FROM projects GROUP BY status
    `);

    res.json({
      projects: projects.rows,
      total: parseInt(count.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(count.rows[0].count) / parseInt(limit)),
      status_counts: statusCounts.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Export projects to Excel
router.get('/projects/export', async (req, res) => {
  try {
    const { status, sector, province, district, search, ids, sort_by = 'created_at', sort_dir = 'desc' } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    // When ids are supplied (Export selected), restrict to just those projects
    const idList = ids ? String(ids).split(',').filter(Boolean) : [];
    if (idList.length) { conditions.push(`p.id = ANY($${idx++}::uuid[])`); params.push(idList); }

    if (status && status !== 'all') { conditions.push(`p.status = $${idx++}`); params.push(status); }
    if (sector) { conditions.push(`p.primary_sector = $${idx++}`); params.push(sector); }
    if (province) { conditions.push(`p.province = $${idx++}`); params.push(province); }
    if (district) { conditions.push(`p.district = $${idx++}`); params.push(district); }
    if (search) {
      conditions.push(`(p.title ILIKE $${idx} OR p.organization_name ILIKE $${idx} OR p.primary_sector ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = projectOrderBy(sort_by, sort_dir);

    const result = await pool.query(`
      SELECT p.project_code, p.title, p.primary_sector, p.province, p.district, p.city, p.status,
             p.total_cost, p.funding_gap, p.expected_roi, p.trl_level,
             p.direct_beneficiaries, p.jobs_created, p.organization_name,
             p.created_at, u.email AS owner_email
      FROM projects p LEFT JOIN users u ON p.user_id = u.id
      ${where}
      ORDER BY ${orderBy}
    `, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('PCPP Projects');
    sheet.columns = [
      { header: 'Project Code', key: 'project_code', width: 15 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Sector', key: 'primary_sector', width: 20 },
      { header: 'Province', key: 'province', width: 20 },
      { header: 'District', key: 'district', width: 20 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Total Cost (PKR)', key: 'total_cost', width: 20 },
      { header: 'Funding Gap (PKR)', key: 'funding_gap', width: 20 },
      { header: 'Expected ROI (%)', key: 'expected_roi', width: 15 },
      { header: 'TRL Level', key: 'trl_level', width: 12 },
      { header: 'Beneficiaries', key: 'direct_beneficiaries', width: 15 },
      { header: 'Jobs Created', key: 'jobs_created', width: 15 },
      { header: 'Organization', key: 'organization_name', width: 30 },
      { header: 'Owner Email', key: 'owner_email', width: 30 },
      { header: 'Submitted Date', key: 'created_at', width: 20 }
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.addRows(result.rows);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=pcpp-projects.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to export' });
  }
});

// GET all users
router.get('/users', async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 15 } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (role && role !== 'all') { conditions.push(`role = $${idx++}`); params.push(role); }
    if (status && status !== 'all') { conditions.push(`status = $${idx++}`); params.push(status); }
    if (search) {
      conditions.push(`(first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx} OR organization ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [users, count] = await Promise.all([
      pool.query(`
        SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.organization,
               u.role, u.status, u.created_at,
               (SELECT COUNT(*) FROM projects WHERE user_id = u.id) AS project_count
        FROM users u ${where}
        ORDER BY u.created_at DESC LIMIT $${idx} OFFSET $${idx+1}
      `, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM users ${where}`, params)
    ]);

    res.json({
      users: users.rows,
      total: parseInt(count.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(count.rows[0].count) / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user status
router.put('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'inactive', 'suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const result = await pool.query('UPDATE users SET status = $1 WHERE id = $2 RETURNING id, email, status', [status, id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Invite user
router.post('/users/invite', async (req, res) => {
  try {
    const { email, role = 'user' } = req.body;
    const token = uuidv4();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(`
      INSERT INTO invitations (email, role, token, invited_by, expires_at)
      VALUES ($1,$2,$3,$4,$5)
    `, [email, role, token, req.user.id, expires]);

    const inviteUrl = `${process.env.FRONTEND_URL}/register?token=${token}&email=${email}`;
    console.log(`Invite link: ${inviteUrl}`);

    res.json({ message: `Invitation sent to ${email}`, invite_url: inviteUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Admin: create an active user directly (returns a one-time temp password).
// Sets both password (NOT NULL) and password_hash (used by login).
router.post('/users', async (req, res) => {
  try {
    const { first_name, last_name, email, role, province, organization } = req.body;
    const allowedRoles = ['admin', 'project_owner', 'investor', 'government', 'ngo', 'provincial'];

    if (!first_name || !last_name || !email || !role) {
      return res.status(400).json({ error: 'first_name, last_name, email and role are required' });
    }
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (role === 'provincial' && !province) {
      return res.status(400).json({ error: 'Province is required for provincial users' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows[0]) return res.status(409).json({ error: 'Email already registered' });

    const tempPassword = crypto.randomBytes(6).toString('hex') + '#7';
    const hash = await bcrypt.hash(tempPassword, 12);

    const result = await pool.query(`
      INSERT INTO users (first_name, last_name, email, organization, role, status, province, password, password_hash)
      VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $7)
      RETURNING id, first_name, last_name, email, role, status, province, organization, created_at
    `, [first_name, last_name, email, organization || null, role, role === 'provincial' ? province : (province || null), hash]);

    res.status(201).json({ user: result.rows[0], temp_password: tempPassword });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Admin add project directly
router.post('/projects', async (req, res) => {
  try {
    const { title, abstract, primary_sector, district, status = 'approved', ...rest } = req.body;
    const result = await pool.query(`
      INSERT INTO projects (title, abstract, primary_sector, district, status, user_id)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [title, abstract, primary_sector, district, status, req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

module.exports = router;
