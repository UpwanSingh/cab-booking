const User = require('../auth/userModel');
const Driver = require('../driver/driverModel');
const Ride = require('../ride/rideModel');
const Payment = require('../payment/paymentModel');
const AppError = require('../../core/utils/AppError');

// @desc    List drivers (with filters)
// @route   GET /api/v1/admin/drivers
exports.listDrivers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filter = {};
        if (req.query.status) filter.approvalStatus = req.query.status.toUpperCase();

        const [drivers, total] = await Promise.all([
            Driver.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 })
                .populate('userId', 'name phone email avatar')
                .populate('vehicleId'),
            Driver.countDocuments(filter),
        ]);

        res.json({ success: true, data: { drivers, total, page, pages: Math.ceil(total / limit) } });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve driver
// @route   PATCH /api/v1/admin/drivers/:id/approve
exports.approveDriver = async (req, res, next) => {
    try {
        const driver = await Driver.findByIdAndUpdate(req.params.id, { approvalStatus: 'APPROVED' }, { new: true })
            .populate('userId', 'name phone email');
        if (!driver) return next(new AppError('Driver not found', 404));
        res.json({ success: true, data: { driver } });
    } catch (error) {
        next(error);
    }
};

// @desc    Reject driver
// @route   PATCH /api/v1/admin/drivers/:id/reject
exports.rejectDriver = async (req, res, next) => {
    try {
        const driver = await Driver.findByIdAndUpdate(req.params.id, { approvalStatus: 'REJECTED' }, { new: true })
            .populate('userId', 'name phone email');
        if (!driver) return next(new AppError('Driver not found', 404));
        res.json({ success: true, data: { driver } });
    } catch (error) {
        next(error);
    }
};

// @desc    Block/unblock user
// @route   PATCH /api/v1/admin/users/:id/block
exports.blockUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: !req.body.unblock }, { new: true });
        if (!user) return next(new AppError('User not found', 404));
        res.json({ success: true, data: { user } });
    } catch (error) {
        next(error);
    }
};

// @desc    List all rides
// @route   GET /api/v1/admin/rides
exports.listRides = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filter = {};
        if (req.query.status) filter.status = req.query.status.toUpperCase();

        const [rides, total] = await Promise.all([
            Ride.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 })
                .populate('passengerId', 'name phone')
                .populate({ path: 'driverId', populate: { path: 'userId', select: 'name phone' } }),
            Ride.countDocuments(filter),
        ]);

        res.json({ success: true, data: { rides, total, page, pages: Math.ceil(total / limit) } });
    } catch (error) {
        next(error);
    }
};

// @desc    List users
// @route   GET /api/v1/admin/users
exports.listUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filter = {};
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { phone: { $regex: req.query.search, $options: 'i' } },
            ];
        }
        const [users, total] = await Promise.all([
            User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
            User.countDocuments(filter),
        ]);

        res.json({ success: true, data: { users, total, page, pages: Math.ceil(total / limit) } });
    } catch (error) {
        next(error);
    }
};

// @desc    Analytics dashboard
// @route   GET /api/v1/admin/analytics
exports.analytics = async (req, res, next) => {
    try {
        const [totalRides, completedRides, activeRides, totalUsers, totalDrivers, totalRevenue] = await Promise.all([
            Ride.countDocuments(),
            Ride.countDocuments({ status: 'COMPLETED' }),
            Ride.countDocuments({ status: { $in: ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] } }),
            User.countDocuments({ role: 'PASSENGER' }),
            Driver.countDocuments(),
            Payment.aggregate([{ $match: { status: 'COMPLETED' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        ]);

        const cancelledRides = await Ride.countDocuments({ status: { $in: ['CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER'] } });
        const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

        // Recent rides for chart
        const recentRides = await Ride.find({ status: 'COMPLETED' })
            .sort({ completedAt: -1 })
            .limit(30)
            .select('actualFare completedAt vehicleType');

        res.json({
            success: true,
            data: {
                totalRides,
                completedRides,
                activeRides,
                cancelledRides,
                totalUsers,
                totalDrivers,
                totalRevenue: revenue,
                cancellationRate: totalRides > 0 ? ((cancelledRides / totalRides) * 100).toFixed(1) : 0,
                recentRides,
            },
        });
    } catch (error) {
        next(error);
    }
};
