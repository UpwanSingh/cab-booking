const express = require('express');
const router = express.Router();
const { protect } = require('../../core/middleware/auth');
const { authorize } = require('../../core/middleware/authorize');
const { updateStatus, updateLocation, getProfile, getEarnings, addVehicle, updateFcmToken } = require('./driverController');

router.use(protect, authorize('DRIVER'));

router.get('/me', getProfile);
router.patch('/me/status', updateStatus);
router.patch('/me/location', updateLocation);
router.get('/me/earnings', getEarnings);
router.post('/me/vehicle', addVehicle);
router.patch('/me/fcm-token', updateFcmToken);

module.exports = router;
