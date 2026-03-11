const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromRole: { type: String, enum: ['PASSENGER', 'DRIVER'], required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 500 },
}, { timestamps: true });

ratingSchema.index({ rideId: 1, fromRole: 1 }, { unique: true });
ratingSchema.index({ toUserId: 1 });

module.exports = mongoose.model('Rating', ratingSchema);
