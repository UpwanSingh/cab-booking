const express = require('express');
const router = express.Router();
const { protect } = require('../../core/middleware/auth');
const { authorize } = require('../../core/middleware/authorize');
const {
    estimate, requestRide, acceptRide, rejectRide,
    arrivedAtPickup, startTrip, completeTrip, cancelRide,
    getRide, getHistory, raiseSOS
} = require('./rideController');

router.post('/estimate', protect, estimate);
router.post('/request', protect, authorize('PASSENGER'), requestRide);
router.get('/history', protect, getHistory);
router.get('/:id', protect, getRide);
router.patch('/:id/accept', protect, authorize('DRIVER'), acceptRide);
router.patch('/:id/reject', protect, authorize('DRIVER'), rejectRide);
router.patch('/:id/arrived', protect, authorize('DRIVER'), arrivedAtPickup);
router.patch('/:id/start', protect, authorize('DRIVER'), startTrip);
router.patch('/:id/complete', protect, authorize('DRIVER'), completeTrip);
router.patch('/:id/cancel', protect, cancelRide);
router.post('/:id/sos', protect, raiseSOS);

module.exports = router;
