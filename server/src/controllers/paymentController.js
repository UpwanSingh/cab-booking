const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');

// @desc    Get payment history
// @route   GET /api/v1/payments/history
exports.getHistory = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = { passengerId: req.user._id };
        const [payments, total] = await Promise.all([
            Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('rideId'),
            Payment.countDocuments(filter),
        ]);

        res.json({ success: true, data: { payments, total, page } });
    } catch (error) {
        next(error);
    }
};

// @desc    Mock create payment intent
// @route   POST /api/v1/payments/create-intent
exports.createIntent = async (req, res, next) => {
    try {
        // Mocked Stripe payment intent
        const { amount } = req.body;
        res.json({
            success: true,
            data: {
                clientSecret: `mock_pi_${Date.now()}_secret`,
                amount,
                currency: 'inr',
                status: 'requires_confirmation',
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Refund payment (admin)
// @route   POST /api/v1/payments/refund
exports.refundPayment = async (req, res, next) => {
    try {
        const payment = await Payment.findById(req.body.paymentId);
        if (!payment) return next(new AppError('Payment not found', 404));

        payment.status = 'REFUNDED';
        await payment.save();

        res.json({ success: true, data: { payment, message: 'Payment refunded successfully' } });
    } catch (error) {
        next(error);
    }
};
