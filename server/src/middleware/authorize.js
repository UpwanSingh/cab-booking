const AppError = require('../utils/AppError');

/**
 * Role-based access control middleware
 * Usage: authorize('ADMIN', 'FLEET_MANAGER')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('Not authorized', 401));
        }
        if (!roles.includes(req.user.role)) {
            return next(new AppError(`Role '${req.user.role}' is not authorized for this action`, 403));
        }
        next();
    };
};

module.exports = { authorize };
