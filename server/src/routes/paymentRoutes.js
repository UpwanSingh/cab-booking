const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { getHistory, createIntent, refundPayment } = require('../controllers/paymentController');

router.get('/history', protect, getHistory);
router.post('/create-intent', protect, createIntent);
router.post('/refund', protect, authorize('ADMIN'), refundPayment);

module.exports = router;
