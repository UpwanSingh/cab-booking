const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const {
    listDrivers, approveDriver, rejectDriver,
    blockUser, listRides, listUsers, analytics,
} = require('../controllers/adminController');

router.use(protect, authorize('ADMIN'));

router.get('/drivers', listDrivers);
router.patch('/drivers/:id/approve', approveDriver);
router.patch('/drivers/:id/reject', rejectDriver);
router.get('/rides', listRides);
router.get('/users', listUsers);
router.patch('/users/:id/block', blockUser);
router.get('/analytics', analytics);

module.exports = router;
