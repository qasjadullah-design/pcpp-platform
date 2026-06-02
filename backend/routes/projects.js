const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET all projects (public with filters)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      sector, district, status = 'approved', search,
      page = 1, limit = 12, sort = 'created_at', order = 'DESC'
    } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    // Public sees only approved; admin/owner sees all
    if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
      conditions.push(`p.status = $${idx++}`);
      params.push('approved');
    } else if (status !== 'all') {
      conditions.push(`p.status = $${idx++}`);
      params.push(status);
    }

    if (sector) { conditions.push(`p.primary_sector = $${idx++}`); params.push(sector); }
    if (district) { conditions.push(`p.district = $${idx++}`); params.push(district); }
    if (search) {
      conditions.push(`(p.title ILIKE $${idx} OR p.abstract ILIKE $${idx} OR p.organization_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const validSorts = ['created_at', 'title', 'total_project_cost', 'expected_roi'];
    const sortCol = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const [projectsResult, countResult] = await Promise.all([
      pool.query(`
        SELECT p.id, p.project_code, p.title, p.abstract, p.primary_sector, p.district, p.city,
               p.status, p.trl_level, p.currency, p.total_project_cost, p.funding_gap,
               p.expected_roi, p.payback_years, p.direct_beneficiaries, p.jobs_created,
               p.organization_name, p.tags, p.progress_percent, p.infographic_url,
               p.created_at, p.risk_level, p.priority_level,
               u.first_name || ' ' || u.last_name AS owner_name
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        ${where}
        ORDER BY p.${sortCol} ${sortOrder}
        LIMIT $${idx} OFFSET $${idx + 1}
      `, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM projects p ${where}`, params)
    ]);

    res.json({
      projects: projectsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET single project
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*, u.first_name || ' ' || u.last_name AS owner_name, u.email AS owner_email
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = $1
    `, [id]);

    if (!result.rows[0]) return res.status(404).json({ error: 'Project not found' });

    const project = result.rows[0];

    // Fetch related data
    const [sdgs, team, docs, videos, updates, shareholders, futurePlans, linkedProjects] = await Promise.all([
      pool.query('SELECT sdg_number FROM project_sdgs WHERE project_id = $1', [id]),
      pool.query('SELECT * FROM project_team WHERE project_id = $1 ORDER BY is_lead DESC', [id]),
      pool.query('SELECT * FROM project_documents WHERE project_id = $1', [id]),
      pool.query('SELECT * FROM project_videos WHERE project_id = $1', [id]),
      pool.query('SELECT pu.*, u.first_name || \' \' || u.last_name AS author_name FROM project_updates pu LEFT JOIN users u ON pu.author_id = u.id WHERE pu.project_id = $1 ORDER BY pu.created_at DESC', [id]),
      pool.query('SELECT * FROM project_shareholders WHERE project_id = $1', [id]),
      pool.query('SELECT * FROM project_future_plans WHERE project_id = $1 ORDER BY created_at', [id]),
      pool.query(`
        SELECT p2.id, p2.title, p2.primary_sector, p2.status, p2.district
        FROM project_links pl
        JOIN projects p2 ON pl.linked_project_id = p2.id
        WHERE pl.project_id = $1
      `, [id])
    ]);

    // Check if user has saved this project
    let isSaved = false;
    if (req.user) {
      const saved = await pool.query('SELECT id FROM saved_projects WHERE user_id = $1 AND project_id = $2', [req.user.id, id]);
      isSaved = saved.rows.length > 0;
    }

    res.json({
      ...project,
      sdg_goals: sdgs.rows.map(r => r.sdg_number),
      team: team.rows,
      documents: docs.rows,
      videos: videos.rows,
      updates: updates.rows,
      shareholders: shareholders.rows,
      future_plans: futurePlans.rows,
      linked_projects: linkedProjects.rows,
      is_saved: isSaved
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// CREATE project
router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      title, abstract, description, primary_sector, sub_sectors,
      sdg_goals, trl_level, risk_level, priority_level,
      duration_months, start_date, expected_completion,
      province, district, city, address,
      currency, total_project_cost, research_fund, equity_fund,
      debt_loan, grant_amount, grant, funding_gap, min_investment, minimum_investment, expected_roi, payback_years,
      direct_beneficiaries, indirect_beneficiaries, jobs_created,
      carbon_market_relevant, carbon_standard, carbon_methodology, carbon_credit_status,
      feasibility_status, feasibility_study_url, feasibility_notes, land_acquired,
      wef_nexus, line_ministry, provincial_contacts, partners,
      organization_name, organization_type, organization_website,
      tags, shareholders, team, videos, future_plans, linked_projects
    } = req.body;

    const normalizedGrantAmount = grant_amount ?? grant ?? null;
    const normalizedMinInvestment = min_investment ?? minimum_investment ?? null;
    const n = (v) => (v === '' || v === undefined ? null : v);

    const result = await client.query(`
      INSERT INTO projects (
  title, abstract, description, primary_sector, sub_sectors,
  trl_level, risk_level, priority_level, status,
  duration_months, start_date, end_date,
  district, city, address,
  currency, total_cost, research_fund, equity_fund,
  debt_loan, grant_amount, funding_gap, minimum_investment, expected_roi, payback_years,
  direct_beneficiaries, indirect_beneficiaries, jobs_created,
  organization_name, organization_type, organization_website,
  tags, user_id, province,
  carbon_market_relevant, carbon_standard, carbon_methodology, carbon_credit_status,
  feasibility_status, feasibility_study_url, feasibility_notes, land_acquired,
  wef_nexus, line_ministry, provincial_contacts, partners
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'under_review',$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45)
RETURNING *
    `, [
  title, abstract, description, primary_sector, sub_sectors,
  n(trl_level), risk_level, priority_level,
  n(duration_months), n(start_date), n(expected_completion),
  district, city, address,
  currency, n(total_project_cost), n(research_fund), n(equity_fund),
  n(debt_loan), n(normalizedGrantAmount), n(funding_gap), n(normalizedMinInvestment), n(expected_roi), n(payback_years),
  n(direct_beneficiaries), n(indirect_beneficiaries), n(jobs_created),
  organization_name, organization_type, organization_website,
  tags, req.user.id, n(province),
  carbon_market_relevant || false, n(carbon_standard), n(carbon_methodology), n(carbon_credit_status),
  n(feasibility_status), n(feasibility_study_url), n(feasibility_notes), land_acquired || false,
  wef_nexus && wef_nexus.length ? wef_nexus : null, n(line_ministry),
  JSON.stringify(provincial_contacts || []), JSON.stringify(partners || [])
]);

    const project = result.rows[0];
    const projectId = project.id;

    // Insert SDGs
    if (sdg_goals?.length) {
      for (const sdg of sdg_goals) {
        await client.query('INSERT INTO project_sdgs (project_id, sdg_number) VALUES ($1,$2)', [projectId, sdg]);
      }
    }

    // Insert team
    if (team?.length) {
      for (const member of team) {
        await client.query(`
          INSERT INTO project_team (project_id, is_lead, full_name, designation, email, phone, linkedin)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
        `, [projectId, member.is_lead || false, member.full_name, member.designation, member.email, member.phone, member.linkedin]);
      }
    }

    // Insert shareholders
    if (shareholders?.length) {
      for (const sh of shareholders) {
        await client.query(`
          INSERT INTO project_shareholders (project_id, name, type, share_percent, amount, contact_email, website, status)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `, [projectId, sh.name, sh.type, sh.share_percent, sh.amount, sh.contact_email, sh.website, sh.status || 'discussion']);
      }
    }

    // Insert videos
    if (videos?.length) {
      for (const v of videos) {
        await client.query('INSERT INTO project_videos (project_id, title, url, duration) VALUES ($1,$2,$3,$4)', [projectId, v.title, v.url, v.duration]);
      }
    }

    // Insert future plans
    if (future_plans?.length) {
      for (const fp of future_plans) {
        await client.query(`
          INSERT INTO project_future_plans (project_id, phase_name, title, timeline, description, estimated_cost)
          VALUES ($1,$2,$3,$4,$5,$6)
        `, [projectId, fp.phase_name, fp.title, fp.timeline, fp.description, fp.estimated_cost]);
      }
    }

    await client.query('COMMIT');

    // Notify admins
    const admins = await pool.query("SELECT id FROM users WHERE role IN ('admin','superadmin')");
    for (const admin of admins.rows) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES ($1,$2,$3,'info',$4)
      `, [admin.id, 'New Project Submitted', `"${title}" has been submitted for review.`, `/admin/projects/${projectId}`]);
    }

    res.status(201).json(project);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create project' });
  } finally {
    client.release();
  }
});

// UPDATE project
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const project = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (!project.rows[0]) return res.status(404).json({ error: 'Project not found' });

    const isOwner = project.rows[0].owner_id === req.user.id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Unauthorized' });

    const allowedFields = [
      'title', 'abstract', 'description', 'primary_sector', 'trl_level',
      'district', 'city', 'currency', 'total_project_cost', 'funding_gap',
      'expected_roi', 'organization_name', 'tags', 'risk_level', 'priority_level'
    ];

    const updates = [];
    const values = [];
    let idx = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(id);
    const result = await pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE project (owner or admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT owner_id FROM projects WHERE id = $1', [id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Project not found' });

    const isOwner = result.rows[0].owner_id === req.user.id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Unauthorized' });

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// POST project update (owner or admin)
router.post('/:id/updates', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { update_type, title, content } = req.body;

    const project = await pool.query('SELECT owner_id FROM projects WHERE id = $1', [id]);
    if (!project.rows[0]) return res.status(404).json({ error: 'Project not found' });

    const isOwner = project.rows[0].owner_id === req.user.id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Unauthorized' });

    const result = await pool.query(`
      INSERT INTO project_updates (project_id, author_id, update_type, title, content)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [id, req.user.id, update_type || 'general', title, content]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to post update' });
  }
});

// Upload document
router.post('/:id/documents', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { document_type } = req.body;

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileUrl = `/uploads/projects/${req.file.filename}`;
    const result = await pool.query(`
      INSERT INTO project_documents (project_id, document_type, file_name, file_url, file_size, uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [id, document_type, req.file.originalname, fileUrl, req.file.size, req.user.id]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Save / unsave project
router.post('/:id/save', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM saved_projects WHERE user_id = $1 AND project_id = $2', [req.user.id, id]);

    if (existing.rows[0]) {
      await pool.query('DELETE FROM saved_projects WHERE user_id = $1 AND project_id = $2', [req.user.id, id]);
      res.json({ saved: false });
    } else {
      await pool.query('INSERT INTO saved_projects (user_id, project_id) VALUES ($1,$2)', [req.user.id, id]);
      res.json({ saved: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle save' });
  }
});

// Get platform statistics (public)
router.get('/stats/public', async (req, res) => {
  try {
    const [projects, funding, beneficiaries, investors] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM projects WHERE status = 'approved'"),
      pool.query("SELECT COALESCE(SUM(total_project_cost),0) AS total FROM projects WHERE status = 'approved'"),
      pool.query("SELECT COALESCE(SUM(direct_beneficiaries),0) AS total FROM projects WHERE status = 'approved'"),
      pool.query("SELECT COUNT(DISTINCT investor_id) FROM interests")
    ]);

    res.json({
      total_projects: parseInt(projects.rows[0].count),
      total_funding: parseInt(funding.rows[0].total),
      total_beneficiaries: parseInt(beneficiaries.rows[0].total),
      active_investors: parseInt(investors.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
