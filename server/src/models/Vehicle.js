const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    color: { type: String, required: true, trim: true },
    plateNumber: { type: String, required: true, uppercase: true, trim: true },
    category: { type: String, enum: ['MINI', 'SEDAN', 'SUV', 'PREMIUM'], required: true },
    capacity: { type: Number, default: 4 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

vehicleSchema.index({ plateNumber: 1 }, { unique: true });
vehicleSchema.index({ driverId: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
