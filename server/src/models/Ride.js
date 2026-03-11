const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
    vehicleType: { type: String, enum: ['MINI', 'SEDAN', 'SUV', 'PREMIUM'], required: true },
    pickup: {
        address: { type: String, required: true },
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], required: true }, // [lng, lat]
        },
    },
    drop: {
        address: { type: String, required: true },
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], required: true },
        },
    },
    status: {
        type: String,
        enum: ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED',
            'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'NO_DRIVERS'],
        default: 'REQUESTED',
    },
    estimatedFare: { type: Number, default: 0 },
    actualFare: { type: Number, default: 0 },
    estimatedDistance: { type: Number, default: 0 },
    actualDistance: { type: Number, default: 0 },
    estimatedDuration: { type: Number, default: 0 },
    actualDuration: { type: Number, default: 0 },
    route: [{ lat: Number, lng: Number, timestamp: Date }],
    paymentMethod: { type: String, enum: ['CASH', 'CARD', 'WALLET'], default: 'CASH' },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    otp: { type: String },
    surgeMultiplier: { type: Number, default: 1.0 },
    cancelledBy: { type: String, default: null },
    cancellationReason: { type: String, default: '' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
}, { timestamps: true });

rideSchema.index({ passengerId: 1, createdAt: -1 });
rideSchema.index({ driverId: 1, createdAt: -1 });
rideSchema.index({ status: 1 });
rideSchema.index({ 'pickup.location': '2dsphere' });
rideSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Ride', rideSchema);
