const router = require('express').Router();
const pool = require('../db/pool');
const { optionalAuth } = require('../middleware/auth');

const toLimit = (value) => Math.min(Math.max(parseInt(value, 10) || 20, 1), 50);

router.get('/', optionalAuth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ projects: [], documents: [], totals: { projects: 0, documents: 0 } });

    const scope = ['all', 'projects', 'documents'].includes(req.query.scope) ? req.query.scope : 'all';
    const limit = toLimit(req.query.limit);
    const offset = Math.max((parseInt(req.query.page, 10) || 1) - 1, 0) * limit;
    const isAdmin = ['admin', 'superadmin'].includes(req.user?.role);
    const isPublic = !req.user;
    const projectVisibility = isAdmin ? 'TRUE' : isPublic
      ? "p.status = 'approved' AND p.priority_level = 'WEF'"
      : "p.status = 'approved'";
    const documentVisibility = isAdmin ? 'TRUE' : isPublic
      ? "d.visibility = 'public' AND p.status = 'approved' AND p.priority_level = 'WEF'"
      : "d.visibility IN ('public', 'registered') AND p.status = 'approved'";

    const projects = scope === 'documents' ? { rows: [] } : await pool.query(`
      SELECT p.id, p.title, p.primary_sector, p.province, p.priority_level, p.status,
             ts_rank(p.search_vector, websearch_to_tsquery('english', $1)) AS rank,
             ts_headline('english', coalesce(p.abstract, p.description, ''), websearch_to_tsquery('english', $1), 'MaxWords=30, MinWords=15') AS snippet
      FROM projects p
      WHERE ${projectVisibility} AND (p.search_vector @@ websearch_to_tsquery('english', $1) OR similarity(p.title, $1) > 0.25)
      ORDER BY rank DESC NULLS LAST, similarity(p.title, $1) DESC, p.created_at DESC LIMIT $2 OFFSET $3`, [q, limit, offset]);

    const documents = scope === 'projects' ? { rows: [] } : await pool.query(`
      SELECT d.id, d.title, d.file_name, d.category, d.file_url, d.project_id, p.title AS project_title,
             ts_rank(d.search_vector, websearch_to_tsquery('english', $1)) AS rank,
             ts_headline('english', left(coalesce(d.extracted_text, d.file_name), 20000), websearch_to_tsquery('english', $1), 'MaxWords=30, MinWords=15') AS snippet
      FROM project_documents d JOIN projects p ON p.id = d.project_id
      WHERE ${documentVisibility} AND d.search_vector @@ websearch_to_tsquery('english', $1)
      ORDER BY rank DESC, d.created_at DESC LIMIT $2 OFFSET $3`, [q, limit, offset]);

    res.json({ projects: projects.rows, documents: documents.rows, totals: { projects: projects.rows.length, documents: documents.rows.length } });
  } catch (error) {
    console.error('Search failed:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
