const Payment = require('./paymentModel');
const AppError = require('../../core/utils/AppError');

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

const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay (Requires ENV vars, otherwise gracefully fails)
const getRazorpayInstance = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return null; // Will fallback to simulation in controller
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

// @desc    Create Razorpay Order
// @route   POST /api/v1/payments/create-order
exports.createRazorpayOrder = async (req, res, next) => {
    try {
        const { amount, receipt } = req.body;
        const rzp = getRazorpayInstance();

        if (!rzp) {
            // Simulated fallback for immediate testing
            return res.json({
                success: true,
                data: {
                    order: {
                        id: `sim_order_${Date.now()}`,
                        amount: amount * 100,
                        currency: 'INR',
                        receipt,
                        status: 'created'
                    },
                    simulated: true
                }
            });
        }

        // Real Razorpay Call (Amount in paise)
        const options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: receipt || `rcpt_${Date.now()}`
        };

        const order = await rzp.orders.create(options);
        res.json({ success: true, data: { order, simulated: false } });
    } catch (error) {
        next(new AppError(error.message || 'Razorpay order creation failed', 500));
    }
};

// @desc    Verify Razorpay Payment Signature
// @route   POST /api/v1/payments/verify
exports.verifyRazorpayPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Handle Simulated verify
        if (razorpay_order_id.startsWith('sim_order_')) {
            return res.json({ success: true, data: { verified: true, simulated: true } });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            res.json({ success: true, data: { verified: true, paymentId: razorpay_payment_id } });
        } else {
            next(new AppError('Invalid Payment Signature', 400));
        }
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
