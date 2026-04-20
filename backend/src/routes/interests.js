const express = require('express');
const router = express.Router();
const { expressInterest, getMyInterests, getProjectInterests, respondToInterest } = require('../controllers/interestController');
const { protect } = require('../middleware/auth');

router.post('/:projectId', protect, expressInterest);
router.get('/my', protect, getMyInterests);
router.get('/project/:projectId', protect, getProjectInterests);
router.put('/:id/respond', protect, respondToInterest);

module.exports = router;
