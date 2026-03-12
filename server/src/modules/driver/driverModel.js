const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    licenseNumber: { type: String, required: true, trim: true },
    licenseExpiry: { type: Date },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    status: { type: String, enum: ['ONLINE', 'OFFLINE', 'ON_TRIP', 'SUSPENDED'], default: 'OFFLINE' },
    currentLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    currentRideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', default: null },
    avgRating: { type: Number, default: 5.0, min: 1, max: 5 },
    totalTrips: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    acceptanceRate: { type: Number, default: 1.0 },
    documents: {
        license: { type: String, default: '' },
        insurance: { type: String, default: '' },
        backgroundCheck: { type: String, default: '' },
    },
    approvalStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'PENDING_VERIFICATION'], default: 'PENDING' },
    fleetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    fcmToken: { type: String, default: null }, // Firebase Cloud Messaging Device Token
}, { timestamps: true });

driverSchema.index({ currentLocation: '2dsphere' });
driverSchema.index({ userId: 1 }, { unique: true });
driverSchema.index({ status: 1, approvalStatus: 1 });

module.exports = mongoose.model('Driver', driverSchema);
