const jwt = require('jsonwebtoken');
const User = require('../../modules/auth/userModel');
const AppError = require('../utils/AppError');

const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new AppError('Not authorized — no token provided', 401));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return next(new AppError('User no longer exists', 401));
        }

        if (user.isBlocked) {
            return next(new AppError('Your account has been blocked', 403));
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Token expired', 401));
        }
        return next(new AppError('Not authorized', 401));
    }
};

module.exports = { protect };
