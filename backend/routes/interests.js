const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const n = (v) => (v === '' || v === undefined ? null : v);

async function createInterest(req, res) {
  try {
    const projectId = req.params.projectId || req.body.project_id;
    const { investment_range_min, investment_range_max, message } = req.body;
    if (!projectId) return res.status(400).json({ error: 'Project id is required' });

    const project = await pool.query('SELECT id, title, user_id FROM projects WHERE id = $1', [projectId]);
    if (!project.rows[0]) return res.status(404).json({ error: 'Project not found' });

    const existing = await pool.query(
      'SELECT id FROM interests WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.id]
    );
    if (existing.rows[0]) return res.status(409).json({ error: 'Already expressed interest in this project' });

    const result = await pool.query(`
      INSERT INTO interests (project_id, user_id, investment_range_min, investment_range_max, message)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [projectId, req.user.id, n(investment_range_min), n(investment_range_max), message]);

    // Notify project owner
    if (project.rows[0].user_id) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES ($1,$2,$3,'info',$4)
      `, [
        project.rows[0].user_id,
        'New Investment Interest',
        `${req.user.first_name} ${req.user.last_name} expressed interest in "${project.rows[0].title}"`,
        `/dashboard/projects`
      ]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to express interest' });
  }
}

// Express interest in a project. The frontend calls /:projectId; keep / with
// body.project_id as a compatibility fallback.
router.post('/', authenticate, createInterest);
router.post('/:projectId', authenticate, createInterest);

// Get investor's interests
router.get('/my', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, p.title AS project_title, p.primary_sector, p.province, p.district,
             p.status AS project_status, p.total_cost, p.funding_gap, p.expected_roi,
             p.organization_name, p.infographic_url
      FROM interests i
      JOIN projects p ON i.project_id = p.id
      WHERE i.user_id = $1
      ORDER BY i.created_at DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interests' });
  }
});

// Get interests for a project (owner only)
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await pool.query('SELECT user_id FROM projects WHERE id = $1', [projectId]);
    if (!project.rows[0]) return res.status(404).json({ error: 'Project not found' });

    const isOwner = project.rows[0].user_id === req.user.id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Unauthorized' });

    const result = await pool.query(`
      SELECT i.*, u.first_name, u.last_name, u.email, u.phone, u.organization
      FROM interests i
      JOIN users u ON i.user_id = u.id
      WHERE i.project_id = $1
      ORDER BY i.created_at DESC
    `, [projectId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interests' });
  }
});

async function respondToInterest(req, res) {
  try {
    const { id } = req.params;
    const reply = req.body.reply || req.body.response;
    if (!reply) return res.status(400).json({ error: 'Response is required' });

    const interest = await pool.query(`
      SELECT i.*, p.user_id AS owner_user_id
      FROM interests i JOIN projects p ON i.project_id = p.id
      WHERE i.id = $1
    `, [id]);

    if (!interest.rows[0]) return res.status(404).json({ error: 'Interest not found' });
    const isOwner = interest.rows[0].owner_user_id === req.user.id;
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Unauthorized' });

    const result = await pool.query(`
      UPDATE interests
      SET owner_response = $1, owner_responded_at = NOW(), status = 'owner_replied', updated_at = NOW()
      WHERE id = $2 RETURNING *
    `, [reply, id]);

    // Notify investor
    await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1,'Interest Reply','The project owner has replied to your interest.','success','/dashboard/interests')
    `, [interest.rows[0].user_id]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send reply' });
  }
}

// Owner reply to interest. Keep /reply for old clients and /respond for the
// current frontend service wrapper.
router.put('/:id/reply', authenticate, respondToInterest);
router.put('/:id/respond', authenticate, respondToInterest);

module.exports = router;
