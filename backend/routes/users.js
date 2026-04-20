const router = require('express').Router();
const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const { authenticate } = require('../middleware/auth');

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { first_name, last_name, phone, organization } = req.body;
    const result = await pool.query(`
      UPDATE users SET first_name=$1, last_name=$2, phone=$3, organization=$4, updated_at=NOW()
      WHERE id=$5 RETURNING id, first_name, last_name, email, phone, organization, role, status
    `, [first_name, last_name, phone, organization, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
    if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const user = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, user.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get user dashboard data
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [myProjects, myInterests, savedProjects, interests_received] = await Promise.all([
      pool.query('SELECT id, title, status, primary_sector, progress_percent, created_at FROM projects WHERE owner_id = $1 ORDER BY created_at DESC', [req.user.id]),
      pool.query(`
        SELECT i.*, p.title AS project_title, p.primary_sector, p.district
        FROM interests i JOIN projects p ON i.project_id = p.id
        WHERE i.investor_id = $1 ORDER BY i.created_at DESC LIMIT 5
      `, [req.user.id]),
      pool.query(`
        SELECT p.id, p.title, p.primary_sector, p.district, p.status, p.total_project_cost
        FROM saved_projects sp JOIN projects p ON sp.project_id = p.id
        WHERE sp.user_id = $1 ORDER BY sp.created_at DESC
      `, [req.user.id]),
      pool.query(`
        SELECT COUNT(*) FROM interests i
        JOIN projects p ON i.project_id = p.id WHERE p.owner_id = $1
      `, [req.user.id])
    ]);

    res.json({
      my_projects: myProjects.rows,
      recent_interests: myInterests.rows,
      saved_projects: savedProjects.rows,
      stats: {
        interests_sent: myInterests.rows.length,
        projects_submitted: myProjects.rows.length,
        interests_received: parseInt(interests_received.rows[0].count),
        saved_projects: savedProjects.rows.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
