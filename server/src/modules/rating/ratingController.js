const Rating = require('./ratingModel');
const Driver = require('../driver/driverModel');
const Ride = require('../ride/rideModel');
const AppError = require('../../core/utils/AppError');

// @desc    Create rating
// @route   POST /api/v1/ratings
exports.createRating = async (req, res, next) => {
    try {
        const { rideId, stars, comment } = req.body;

        const ride = await Ride.findById(rideId);
        if (!ride || ride.status !== 'COMPLETED') return next(new AppError('Can only rate completed rides', 400));

        const isPassenger = req.user.role === 'PASSENGER';
        const fromRole = isPassenger ? 'PASSENGER' : 'DRIVER';

        // Determine target
        let toUserId;
        if (isPassenger) {
            const driver = await Driver.findById(ride.driverId);
            toUserId = driver ? driver.userId : null;
        } else {
            toUserId = ride.passengerId;
        }

        if (!toUserId) return next(new AppError('Target user not found', 404));

        // Check if already rated
        const existing = await Rating.findOne({ rideId, fromRole });
        if (existing) return next(new AppError('Already rated this ride', 400));

        const rating = await Rating.create({
            rideId,
            fromUserId: req.user._id,
            toUserId,
            fromRole,
            stars,
            comment: comment || '',
        });

        // Update driver average rating if passenger rated
        if (isPassenger) {
            const driverRatings = await Rating.find({ toUserId, fromRole: 'PASSENGER' });
            const avg = driverRatings.reduce((sum, r) => sum + r.stars, 0) / driverRatings.length;
            await Driver.findOneAndUpdate({ userId: toUserId }, { avgRating: Math.round(avg * 10) / 10 });
        }

        res.status(201).json({ success: true, data: { rating } });
    } catch (error) {
        next(error);
    }
};

// @desc    Get ratings for a user
// @route   GET /api/v1/ratings/user/:id
exports.getUserRatings = async (req, res, next) => {
    try {
        const ratings = await Rating.find({ toUserId: req.params.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('fromUserId', 'name avatar');

        const avgStars = ratings.length > 0
            ? Math.round((ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length) * 10) / 10
            : 0;

        res.json({ success: true, data: { ratings, avgStars, total: ratings.length } });
    } catch (error) {
        next(error);
    }
};
