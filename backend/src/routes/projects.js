const express = require('express');
const router = express.Router();
const { getProjects, getProject, createProject, updateProject, deleteProject, submitProject, getMyProjects, toggleSave, getSavedProjects, postUpdate, getStats } = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/stats', getStats);
router.get('/my', protect, getMyProjects);
router.get('/saved', protect, getSavedProjects);
router.get('/', getProjects);
router.get('/stats/by-province', projectController.getStatsByProvince);
router.get('/:id', getProject);
router.post('/', protect, createProject);
router.put('/:id', protect, updateProject);
router.delete('/:id', protect, deleteProject);
router.post('/:id/submit', protect, submitProject);
router.post('/:id/save', protect, toggleSave);
router.post('/:id/updates', protect, postUpdate);
router.post('/:id/upload', protect, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.status(200).json({ success: true, url: `/uploads/${req.file.filename}`, filename: req.file.filename });
});

module.exports = router;
