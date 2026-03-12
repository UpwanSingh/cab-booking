const Driver = require('./driverModel');
const Vehicle = require('./vehicleModel');
const Payment = require('../payment/paymentModel');
const AppError = require('../../core/utils/AppError');

// @desc    Update driver status (online/offline)
// @route   PATCH /api/v1/drivers/me/status
exports.updateStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['ONLINE', 'OFFLINE'].includes(status)) return next(new AppError('Invalid status', 400));

        const driver = await Driver.findOne({ userId: req.user._id });
        if (!driver) return next(new AppError('Driver profile not found', 404));
        if (driver.approvalStatus !== 'APPROVED') return next(new AppError('Driver not approved yet', 403));
        if (driver.currentRideId && status === 'OFFLINE') return next(new AppError('Cannot go offline during an active ride', 400));

        driver.status = status;
        await driver.save();

        res.json({ success: true, data: { driver } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update driver location
// @route   PATCH /api/v1/drivers/me/location
exports.updateLocation = async (req, res, next) => {
    try {
        const { lat, lng } = req.body;
        if (!lat || !lng) return next(new AppError('lat and lng are required', 400));

        await Driver.findOneAndUpdate(
            { userId: req.user._id },
            { currentLocation: { type: 'Point', coordinates: [lng, lat] } }
        );

        res.json({ success: true, data: { ok: true } });
    } catch (error) {
        next(error);
    }
};

// @desc    Get own driver profile
// @route   GET /api/v1/drivers/me
exports.getProfile = async (req, res, next) => {
    try {
        const driver = await Driver.findOne({ userId: req.user._id })
            .populate('vehicleId')
            .populate('userId', 'name phone email avatar');
        if (!driver) return next(new AppError('Driver profile not found', 404));

        res.json({ success: true, data: { driver } });
    } catch (error) {
        next(error);
    }
};

// @desc    Get driver earnings
// @route   GET /api/v1/drivers/me/earnings
exports.getEarnings = async (req, res, next) => {
    try {
        const driver = await Driver.findOne({ userId: req.user._id });
        if (!driver) return next(new AppError('Driver profile not found', 404));

        const period = req.query.period || 'daily';
        const now = new Date();
        let fromDate;

        switch (period) {
            case 'daily': fromDate = new Date(now.setHours(0, 0, 0, 0)); break;
            case 'weekly': fromDate = new Date(now.setDate(now.getDate() - 7)); break;
            case 'monthly': fromDate = new Date(now.setMonth(now.getMonth() - 1)); break;
            default: fromDate = new Date(now.setHours(0, 0, 0, 0));
        }

        const payments = await Payment.find({
            driverId: driver._id,
            status: 'COMPLETED',
            createdAt: { $gte: fromDate },
        }).sort({ createdAt: -1 });

        const totalEarnings = payments.reduce((sum, p) => sum + p.driverPayout, 0);
        const totalTrips = payments.length;

        res.json({
            success: true,
            data: {
                period,
                totalEarnings,
                totalTrips,
                allTimeEarnings: driver.totalEarnings,
                allTimeTrips: driver.totalTrips,
                payments,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add / update vehicle
// @route   POST /api/v1/drivers/me/vehicle
exports.addVehicle = async (req, res, next) => {
    try {
        const driver = await Driver.findOne({ userId: req.user._id });
        if (!driver) return next(new AppError('Driver profile not found', 404));

        const { make, model, year, color, plateNumber, category } = req.body;

        let vehicle = await Vehicle.findOne({ driverId: driver._id });
        if (vehicle) {
            Object.assign(vehicle, { make, model, year, color, plateNumber, category });
            await vehicle.save();
        } else {
            vehicle = await Vehicle.create({ driverId: driver._id, make, model, year, color, plateNumber, category });
        }

        driver.vehicleId = vehicle._id;
        // Require manual KYC approval by Admin
        if (driver.approvalStatus !== 'APPROVED') {
            driver.approvalStatus = 'PENDING_VERIFICATION';
        }
        await driver.save();

        res.status(201).json({ success: true, data: { vehicle, driver } });
    } catch (error) {
        next(error);
    }
};

// @desc    Update FCM Push Token
// @route   PATCH /api/v1/drivers/fcm-token
exports.updateFcmToken = async (req, res, next) => {
    try {
        const { fcmToken } = req.body;
        const driver = await Driver.findOneAndUpdate(
            { userId: req.user._id },
            { fcmToken },
            { new: true }
        );
        if (!driver) return res.json({ success: true, message: 'Driver profile not setup yet' }); // Ignore for passengers

        res.json({ success: true, data: { message: 'FCM Token updated' } });
    } catch (error) {
        next(error);
    }
};
