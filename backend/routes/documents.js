const { Readable } = require('stream');
const router = require('express').Router();
const pool = require('../db/pool');
const { optionalAuth, authenticate } = require('../middleware/auth');
const { deleteObject, getObject } = require('../services/storage');

const canManage = (user, document) => Boolean(user && (
  ['admin', 'superadmin'].includes(user.role) || document.user_id === user.id ||
  (user.role === 'provincial' && document.province === user.province)
));

router.get('/:docId/download', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, p.user_id, p.province, p.status AS project_status
      FROM project_documents d JOIN projects p ON p.id = d.project_id
      WHERE d.id = $1
    `, [req.params.docId]);
    const document = result.rows[0];
    if (!document) return res.status(404).json({ error: 'Document not found' });

    const manager = canManage(req.user, document);
    const isPublic = document.visibility === 'public' && document.project_status === 'approved';
    const isRegistered = req.user && document.visibility === 'registered';
    if (!manager && !isPublic && !isRegistered) return res.status(req.user ? 403 : 401).json({ error: 'Document access denied' });

    if (!document.storage_key) return res.redirect(document.file_url);

    const object = await getObject(document.storage_key);
    res.setHeader('Content-Type', object.contentType || document.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(document.file_name)}`);
    const body = typeof object.body.pipe === 'function' ? object.body : Readable.fromWeb(object.body);
    body.on('error', (error) => {
      console.error('Document stream failed:', error);
      if (!res.headersSent) res.status(502).json({ error: 'Failed to read document' });
      else res.destroy(error);
    });
    body.pipe(res);
  } catch (error) {
    console.error('Failed to download document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

router.delete('/:docId', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, p.user_id, p.province FROM project_documents d
      JOIN projects p ON p.id = d.project_id WHERE d.id = $1
    `, [req.params.docId]);
    const document = result.rows[0];
    if (!document) return res.status(404).json({ error: 'Document not found' });
    if (!canManage(req.user, document)) return res.status(403).json({ error: 'Forbidden' });

    await deleteObject(document.storage_key);
    await pool.query('DELETE FROM project_documents WHERE id = $1', [document.id]);
    res.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;
