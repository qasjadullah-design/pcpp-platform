const router = require('express').Router();
const pool = require('../db/pool');

// Controlled lookup data used by project forms and public filters.
router.get('/districts', async (req, res) => {
  try {
    const province = String(req.query.province || '').trim();
    const params = province ? [province] : [];
    const where = province ? 'WHERE province = $1' : '';
    const result = await pool.query(
      `SELECT id, province, name FROM districts ${where} ORDER BY province, name`, params
    );
    res.json({ districts: result.rows });
  } catch (error) {
    console.error('Failed to fetch district metadata:', error);
    res.status(500).json({ error: 'Failed to fetch district metadata' });
  }
});

router.get('/funding-source-types', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT code, label, sort_order FROM funding_source_types WHERE active = true ORDER BY sort_order, label'
    );
    res.json({ funding_source_types: result.rows });
  } catch (error) {
    console.error('Failed to fetch funding-source metadata:', error);
    res.status(500).json({ error: 'Failed to fetch funding-source metadata' });
  }
});

module.exports = router;
