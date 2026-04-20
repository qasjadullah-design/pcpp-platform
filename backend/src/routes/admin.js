const express = require('express');
const router = express.Router();
const { reviewProject, changeProjectStatus, getAnalytics, getUsers, updateUserStatus } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));
router.put('/projects/:id/review', reviewProject);
router.put('/projects/:id/status', changeProjectStatus);
router.get('/analytics', getAnalytics);
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);

module.exports = router;
