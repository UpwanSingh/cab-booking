const express = require('express');
const router = express.Router();
const { protect } = require('../../core/middleware/auth');
const { authorize } = require('../../core/middleware/authorize');
const { getHistory, createRazorpayOrder, verifyRazorpayPayment, refundPayment } = require('./paymentController');

router.get('/history', protect, getHistory);
router.post('/create-order', protect, createRazorpayOrder);
router.post('/verify', protect, verifyRazorpayPayment);
router.post('/refund', protect, authorize('ADMIN'), refundPayment);

module.exports = router;
