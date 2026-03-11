const Ride = require('./rideModel');
const Driver = require('../driver/driverModel');
const Payment = require('../payment/paymentModel');
const AppError = require('../../core/utils/AppError');
const { calculateFare, estimateDistanceAndDuration, getAllFareEstimates } = require('./fareService');
const { assignRide, resolveDriverResponse } = require('./allocationService');

// @desc    Fare estimate
// @route   POST /api/v1/rides/estimate
exports.estimate = async (req, res, next) => {
    try {
        const { pickup, drop } = req.body;
        const estimates = getAllFareEstimates(pickup.lat, pickup.lng, drop.lat, drop.lng);
        res.json({ success: true, data: { estimates } });
    } catch (error) {
        next(error);
    }
};

// @desc    Request a ride
// @route   POST /api/v1/rides/request
exports.requestRide = async (req, res, next) => {
    try {
        // Check for active rides
        const activeRide = await Ride.findOne({
            passengerId: req.user._id,
            status: { $in: ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] },
        });
        if (activeRide) return next(new AppError('You already have an active ride', 409));

        const { pickup, drop, vehicleType, paymentMethod } = req.body;
        const { distanceKm, durationMin } = estimateDistanceAndDuration(pickup.lat, pickup.lng, drop.lat, drop.lng);
        const fareBreakdown = calculateFare(distanceKm, durationMin, vehicleType);
        const otp = String(Math.floor(1000 + Math.random() * 9000));

        const ride = await Ride.create({
            passengerId: req.user._id,
            vehicleType,
            pickup: {
                address: pickup.address || 'Pickup Location',
                location: { type: 'Point', coordinates: [pickup.lng, pickup.lat] },
            },
            drop: {
                address: drop.address || 'Drop Location',
                location: { type: 'Point', coordinates: [drop.lng, drop.lat] },
            },
            estimatedFare: fareBreakdown.total,
            estimatedDistance: distanceKm,
            estimatedDuration: durationMin,
            paymentMethod: paymentMethod || 'CASH',
            otp,
        });

        // Try to assign a driver (non-blocking)
        const io = req.app.get('io');
        io.to(`user_${req.user._id}`).emit('ride:searching', { rideId: ride._id });

        // Run allocation in background
        setImmediate(async () => {
            try {
                const driver = await assignRide(ride, io);
                if (!driver) {
                    // No real driver found or accepted within timeout
                    console.log('❌ No real drivers available. Cancelling ride...');
                    ride.status = 'CANCELLED_BY_SYSTEM';
                    ride.cancellationReason = 'No drivers available';
                    await ride.save();

                    io.to(`user_${ride.passengerId}`).emit('ride:no_drivers', { rideId: ride._id });
                }
            } catch (err) {
                console.error('Allocation error:', err);
            }
        });

        res.status(201).json({ success: true, data: { ride, fareBreakdown, otp } });
    } catch (error) {
        next(error);
    }
};

// @desc    Accept a ride (driver)
// @route   PATCH /api/v1/rides/:id/accept
exports.acceptRide = async (req, res, next) => {
    try {
        const ride = await Ride.findById(req.params.id);
        if (!ride) return next(new AppError('Ride not found', 404));
        if (ride.status !== 'REQUESTED') return next(new AppError('Ride is no longer available', 400));

        const driver = await Driver.findOne({ userId: req.user._id }).populate('vehicleId').populate('userId', 'name phone');
        if (!driver) return next(new AppError('Driver profile not found', 404));

        // Resolve the pending allocation response
        resolveDriverResponse(ride._id, driver._id, true);

        ride.driverId = driver._id;
        ride.status = 'ACCEPTED';
        await ride.save();

        driver.currentRideId = ride._id;
        driver.status = 'ON_TRIP';
        await driver.save();

        const io = req.app.get('io');

        // Notify passenger
        io.to(`user_${ride.passengerId}`).emit('ride:accepted', {
            rideId: ride._id,
            driver: {
                _id: driver._id,
                name: driver.userId.name,
                phone: driver.userId.phone,
                rating: driver.avgRating,
                vehicle: driver.vehicleId,
                location: driver.currentLocation,
            },
        });

        // Join ride room
        io.to(`driver_${req.user._id}`).emit('ride:join', ride._id.toString());

        res.json({ success: true, data: { ride } });
    } catch (error) {
        next(error);
    }
};

// @desc    Reject a ride (driver)
// @route   PATCH /api/v1/rides/:id/reject
exports.rejectRide = async (req, res, next) => {
    try {
        const driver = await Driver.findOne({ userId: req.user._id });
        if (!driver) return next(new AppError('Driver profile not found', 404));

        resolveDriverResponse(req.params.id, driver._id, false);
        res.json({ success: true, data: { message: 'Ride rejected' } });
    } catch (error) {
        next(error);
    }
};

// @desc    Driver arrived at pickup
// @route   PATCH /api/v1/rides/:id/arrived
exports.arrivedAtPickup = async (req, res, next) => {
    try {
        const ride = await Ride.findById(req.params.id);
        if (!ride || ride.status !== 'ACCEPTED') return next(new AppError('Invalid ride state', 400));

        ride.status = 'ARRIVED';
        await ride.save();

        const io = req.app.get('io');
        io.to(`user_${ride.passengerId}`).emit('ride:driver_arrived', { rideId: ride._id, otp: ride.otp });

        res.json({ success: true, data: { ride } });
    } catch (error) {
        next(error);
    }
};

// @desc    Start trip
// @route   PATCH /api/v1/rides/:id/start
exports.startTrip = async (req, res, next) => {
    try {
        const ride = await Ride.findById(req.params.id);
        if (!ride || ride.status !== 'ARRIVED') return next(new AppError('Invalid ride state', 400));

        // Verify OTP
        if (req.body.otp !== ride.otp) return next(new AppError('Invalid OTP', 400));

        ride.status = 'IN_PROGRESS';
        ride.startedAt = new Date();
        await ride.save();

        const io = req.app.get('io');
        io.to(`user_${ride.passengerId}`).emit('ride:started', { rideId: ride._id });

        res.json({ success: true, data: { ride } });
    } catch (error) {
        next(error);
    }
};

// @desc    Complete trip
// @route   PATCH /api/v1/rides/:id/complete
exports.completeTrip = async (req, res, next) => {
    try {
        const ride = await Ride.findById(req.params.id);
        if (!ride || ride.status !== 'IN_PROGRESS') return next(new AppError('Invalid ride state', 400));

        ride.status = 'COMPLETED';
        ride.completedAt = new Date();

        // Calculate actual fare based on actual distance/duration
        const actualDuration = Math.round((ride.completedAt - ride.startedAt) / 60000);
        const fareBreakdown = calculateFare(ride.estimatedDistance, actualDuration, ride.vehicleType, ride.surgeMultiplier);
        ride.actualFare = fareBreakdown.total;
        ride.actualDistance = ride.estimatedDistance;
        ride.actualDuration = actualDuration;
        await ride.save();

        // Create payment
        const payment = await Payment.create({
            rideId: ride._id,
            passengerId: ride.passengerId,
            driverId: ride.driverId,
            amount: fareBreakdown.total,
            method: ride.paymentMethod,
            status: 'COMPLETED',
            breakdown: fareBreakdown,
            driverPayout: fareBreakdown.driverPayout,
            platformCommission: fareBreakdown.platformCommission,
        });

        ride.paymentId = payment._id;
        await ride.save();

        // Update driver
        const driver = await Driver.findById(ride.driverId);
        if (driver) {
            driver.currentRideId = null;
            driver.status = 'ONLINE';
            driver.totalTrips += 1;
            driver.totalEarnings += fareBreakdown.driverPayout;
            await driver.save();
        }

        const io = req.app.get('io');
        io.to(`user_${ride.passengerId}`).emit('ride:completed', {
            rideId: ride._id,
            fare: fareBreakdown,
            paymentMethod: ride.paymentMethod,
        });

        res.json({ success: true, data: { ride, payment, fareBreakdown } });
    } catch (error) {
        next(error);
    }
};

// @desc    Cancel ride
// @route   PATCH /api/v1/rides/:id/cancel
exports.cancelRide = async (req, res, next) => {
    try {
        const ride = await Ride.findById(req.params.id);
        if (!ride) return next(new AppError('Ride not found', 404));

        const cancellable = ['REQUESTED', 'ACCEPTED', 'ARRIVED'];
        if (!cancellable.includes(ride.status)) return next(new AppError('Cannot cancel this ride', 400));

        const isDriver = req.user.role === 'DRIVER';
        ride.status = isDriver ? 'CANCELLED_BY_DRIVER' : 'CANCELLED_BY_PASSENGER';
        ride.cancelledBy = req.user._id;
        ride.cancellationReason = req.body.reason || '';
        await ride.save();

        // Free up driver
        if (ride.driverId) {
            const driver = await Driver.findById(ride.driverId);
            if (driver) {
                driver.currentRideId = null;
                driver.status = 'ONLINE';
                if (isDriver) driver.acceptanceRate = Math.max(0, driver.acceptanceRate - 0.05);
                await driver.save();
            }
        }

        const io = req.app.get('io');
        io.to(`ride_${ride._id}`).emit('ride:cancelled', {
            rideId: ride._id,
            by: isDriver ? 'DRIVER' : 'PASSENGER',
            reason: ride.cancellationReason,
        });

        res.json({ success: true, data: { ride } });
    } catch (error) {
        next(error);
    }
};

// @desc    Get ride by ID
// @route   GET /api/v1/rides/:id
exports.getRide = async (req, res, next) => {
    try {
        const ride = await Ride.findById(req.params.id)
            .populate('passengerId', 'name phone avatar')
            .populate({ path: 'driverId', populate: [{ path: 'userId', select: 'name phone avatar' }, { path: 'vehicleId' }] });

        if (!ride) return next(new AppError('Ride not found', 404));
        res.json({ success: true, data: { ride } });
    } catch (error) {
        next(error);
    }
};

// @desc    Get ride history
// @route   GET /api/v1/rides/history
exports.getHistory = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let filter = {};
        if (req.user.role === 'PASSENGER') {
            filter.passengerId = req.user._id;
        } else if (req.user.role === 'DRIVER') {
            const driver = await Driver.findOne({ userId: req.user._id });
            if (driver) filter.driverId = driver._id;
        }

        const [rides, total] = await Promise.all([
            Ride.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
                .populate('passengerId', 'name phone')
                .populate({ path: 'driverId', populate: { path: 'userId', select: 'name phone' } }),
            Ride.countDocuments(filter),
        ]);

        res.json({ success: true, data: { rides, total, page, pages: Math.ceil(total / limit) } });
    } catch (error) {
        next(error);
    }
};
