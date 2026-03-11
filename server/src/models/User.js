const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 50 },
    email: {
        type: String, sparse: true, trim: true, lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'],
    },
    phone: { type: String, required: [true, 'Phone is required'], trim: true },
    password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
    role: { type: String, enum: ['PASSENGER', 'DRIVER', 'ADMIN', 'FLEET_MANAGER'], default: 'PASSENGER' },
    avatar: { type: String, default: '' },
    savedAddresses: [{
        label: String,
        lat: Number,
        lng: Number,
        address: String,
    }],
    wallet: {
        balance: { type: Number, default: 500 },
        currency: { type: String, default: 'INR' },
    },
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    refreshToken: { type: String, select: false },
    fcmToken: { type: String, default: '' },
}, { timestamps: true });

// Hash password
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Match password
userSchema.methods.matchPassword = async function (entered) {
    return bcrypt.compare(entered, this.password);
};

userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);
