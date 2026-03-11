const express = require('express');
const router = express.Router();
const { protect } = require('../../core/middleware/auth');
const { authorize } = require('../../core/middleware/authorize');
const { getHistory, createIntent, refundPayment } = require('./paymentController');

router.get('/history', protect, getHistory);
router.post('/create-intent', protect, createIntent);
router.post('/refund', protect, authorize('ADMIN'), refundPayment);

module.exports = router;
