const jwt = require('jsonwebtoken');
const User = require('./userModel');
const Driver = require('../driver/driverModel');
const AppError = require('../../core/utils/AppError');

const generateAccessToken = (user) => {
    return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '15m' });
};

const generateRefreshToken = (user) => {
    return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' });
};

// @desc    Register user
// @route   POST /api/v1/auth/register
exports.register = async (req, res, next) => {
    try {
        const { name, phone, email, password, role } = req.body;

        // Check if user exists
        const existing = await User.findOne({ phone });
        if (existing) return next(new AppError('Phone number already registered', 400));

        const user = await User.create({ name, phone, email, password, role: role || 'PASSENGER' });

        // If registering as driver, create driver profile
        if (user.role === 'DRIVER') {
            await Driver.create({
                userId: user._id,
                licenseNumber: req.body.licenseNumber || 'PENDING',
            });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        user.refreshToken = refreshToken;
        await user.save({ validateModifiedOnly: true });

        res.status(201).json({
            success: true,
            data: {
                user: { _id: user._id, name: user.name, phone: user.phone, email: user.email, role: user.role, wallet: user.wallet },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
exports.login = async (req, res, next) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) return next(new AppError('Please provide phone and password', 400));

        const user = await User.findOne({ phone }).select('+password');
        if (!user) return next(new AppError('Invalid credentials', 401));

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return next(new AppError('Invalid credentials', 401));

        if (user.isBlocked) return next(new AppError('Your account has been blocked', 403));

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        user.refreshToken = refreshToken;
        await user.save({ validateModifiedOnly: true });

        res.json({
            success: true,
            data: {
                user: { _id: user._id, name: user.name, phone: user.phone, email: user.email, role: user.role, wallet: user.wallet },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh-token
exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return next(new AppError('Refresh token required', 400));

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id).select('+refreshToken');
        if (!user || user.refreshToken !== refreshToken) {
            return next(new AppError('Invalid refresh token', 401));
        }

        const newAccessToken = generateAccessToken(user);
        res.json({ success: true, data: { accessToken: newAccessToken } });
    } catch (error) {
        next(new AppError('Invalid refresh token', 401));
    }
};

// @desc    Logout
// @route   POST /api/v1/auth/logout
exports.logout = async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { refreshToken: '' });
        res.json({ success: true, data: { message: 'Logged out successfully' } });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        let driverProfile = null;
        if (user.role === 'DRIVER') {
            driverProfile = await Driver.findOne({ userId: user._id }).populate('vehicleId');
        }
        res.json({ success: true, data: { user, driverProfile } });
    } catch (error) {
        next(error);
    }
};

// @desc    Top up wallet (mock payment)
// @route   PATCH /api/v1/auth/wallet/topup
exports.walletTopup = async (req, res, next) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0 || amount > 50000) return next(new AppError('Amount must be between 1 and 50000', 400));

        const user = await User.findById(req.user._id);
        user.wallet.balance += amount;
        await user.save({ validateModifiedOnly: true });

        res.json({ success: true, data: { wallet: user.wallet, message: `₹${amount} added successfully` } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update profile
// @route   PATCH /api/v1/auth/profile
exports.updateProfile = async (req, res, next) => {
    try {
        const { name, email } = req.body;
        const updates = {};
        if (name) updates.name = name;
        if (email) updates.email = email;

        const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
        res.json({ success: true, data: { user } });
    } catch (error) {
        next(error);
    }
};

// @desc    Guest login (auto-create account)
// @route   POST /api/v1/auth/guest
exports.guestLogin = async (req, res, next) => {
    try {
        const guestId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const guestName = `Guest_${guestId.slice(-4)}`;

        const user = await User.create({
            name: guestName,
            phone: guestId,
            email: `${guestName.toLowerCase()}@guest.cabgo.local`,
            password: `guest_${guestId}`,
            role: 'PASSENGER',
            isVerified: true,
        });

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        user.refreshToken = refreshToken;
        await user.save({ validateModifiedOnly: true });

        res.status(201).json({
            success: true,
            data: {
                user: { _id: user._id, name: user.name, phone: user.phone, email: user.email, role: user.role, wallet: user.wallet },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
};
