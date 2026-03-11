const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    method: { type: String, enum: ['CASH', 'CARD', 'WALLET'], required: true },
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'], default: 'PENDING' },
    stripePaymentIntentId: { type: String, default: '' },
    breakdown: {
        baseFare: { type: Number, default: 0 },
        distanceCharge: { type: Number, default: 0 },
        timeCharge: { type: Number, default: 0 },
        surgeCharge: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
    },
    driverPayout: { type: Number, default: 0 },
    platformCommission: { type: Number, default: 0 },
}, { timestamps: true });

paymentSchema.index({ rideId: 1 }, { unique: true });
paymentSchema.index({ passengerId: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
