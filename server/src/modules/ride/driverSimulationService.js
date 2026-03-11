const User = require('../auth/userModel');
const Driver = require('../driver/driverModel');
const Vehicle = require('../driver/vehicleModel');
const Ride = require('./rideModel');
const Payment = require('../payment/paymentModel');
const { calculateFare } = require('./fareService');

const SIM_DRIVER_PHONE = '__sim_driver__';
const SIM_DRIVER_NAME = 'CabGo Auto Driver';

/**
 * Ensure a simulated driver exists in the DB, is online,
 * and has a vehicle. Returns the Driver doc.
 */
async function ensureSimDriver(pickupCoords) {
    let user = await User.findOne({ phone: SIM_DRIVER_PHONE });

    if (!user) {
        user = await User.create({
            name: SIM_DRIVER_NAME,
            phone: SIM_DRIVER_PHONE,
            email: 'sim@cabgo.com',
            password: 'sim_password_never_used_for_login',
            role: 'DRIVER',
            isVerified: true,
        });
    }

    let driver = await Driver.findOne({ userId: user._id });
    if (!driver) {
        driver = await Driver.create({
            userId: user._id,
            licenseNumber: 'SIM-AUTO-001',
            approvalStatus: 'APPROVED',
            status: 'ONLINE',
            avgRating: 4.8,
            totalTrips: 142,
            totalEarnings: 45200,
            acceptanceRate: 0.97,
            currentLocation: {
                type: 'Point',
                coordinates: pickupCoords, // [lng, lat]
            },
        });
    }

    let vehicle = await Vehicle.findOne({ driverId: driver._id });
    if (!vehicle) {
        vehicle = await Vehicle.create({
            driverId: driver._id,
            make: 'Maruti Suzuki',
            model: 'Dzire',
            year: 2024,
            color: 'White',
            plateNumber: 'DL-SIM-0001',
            category: 'SEDAN',
            capacity: 4,
        });
        driver.vehicleId = vehicle._id;
    }

    // Move driver near pickup and set online
    driver.status = 'ONLINE';
    driver.currentRideId = null;
    driver.currentLocation = { type: 'Point', coordinates: pickupCoords };
    await driver.save();

    return { user, driver, vehicle };
}

/**
 * Simulate a full ride lifecycle:
 *   accepted → arrived → started (OTP) → completed
 */
async function simulateRideFlow(ride, io) {
    const pickupCoords = ride.pickup.location.coordinates;

    // Slight offset so driver "approaches" pickup
    const nearPickup = [pickupCoords[0] + 0.003, pickupCoords[1] + 0.002];
    const { user: simUser, driver, vehicle } = await ensureSimDriver(nearPickup);

    console.log(`🤖 SimDriver: Accepting ride ${ride._id}...`);

    // === Step 1: Accept (after 6s) ===
    await delay(6000);

    ride.driverId = driver._id;
    ride.status = 'ACCEPTED';
    await ride.save();

    driver.currentRideId = ride._id;
    driver.status = 'ON_TRIP';
    await driver.save();

    io.to(`user_${ride.passengerId}`).emit('ride:accepted', {
        rideId: ride._id,
        driver: {
            _id: driver._id,
            name: simUser.name,
            phone: '1800-CABGO',
            rating: driver.avgRating,
            vehicle: {
                make: vehicle.make,
                model: vehicle.model,
                color: vehicle.color,
                plateNumber: vehicle.plateNumber,
                category: vehicle.category,
            },
            location: driver.currentLocation,
        },
    });

    // === Step 2: Move towards pickup + Arrived (after 8s) ===
    await delay(3000);
    // Emit intermediate location updates
    const midPoint = [(nearPickup[0] + pickupCoords[0]) / 2, (nearPickup[1] + pickupCoords[1]) / 2];
    io.to(`user_${ride.passengerId}`).emit('driver:location', { lat: midPoint[1], lng: midPoint[0] });

    await delay(3000);
    io.to(`user_${ride.passengerId}`).emit('driver:location', { lat: pickupCoords[1], lng: pickupCoords[0] });

    await delay(2000);
    ride.status = 'ARRIVED';
    await ride.save();
    io.to(`user_${ride.passengerId}`).emit('ride:driver_arrived', { rideId: ride._id, otp: ride.otp });
    console.log(`🤖 SimDriver: Arrived at pickup. OTP: ${ride.otp}`);

    // === Step 3: Start trip (after 5s, using OTP from DB) ===
    await delay(5000);
    ride.status = 'IN_PROGRESS';
    ride.startedAt = new Date();
    await ride.save();
    io.to(`user_${ride.passengerId}`).emit('ride:started', { rideId: ride._id });
    console.log(`🤖 SimDriver: Trip started.`);

    // === Step 4: Simulate driving with location updates ===
    const dropCoords = ride.drop.location.coordinates;
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
        await delay(2000);
        const frac = i / steps;
        const lat = pickupCoords[1] + (dropCoords[1] - pickupCoords[1]) * frac;
        const lng = pickupCoords[0] + (dropCoords[0] - pickupCoords[0]) * frac;
        io.to(`user_${ride.passengerId}`).emit('driver:location', { lat, lng });
    }

    // === Step 5: Complete (after driving animation) ===
    await delay(2000);
    ride.status = 'COMPLETED';
    ride.completedAt = new Date();

    const actualDuration = Math.max(1, Math.round((ride.completedAt - ride.startedAt) / 60000));
    const fareBreakdown = calculateFare(ride.estimatedDistance, actualDuration, ride.vehicleType, ride.surgeMultiplier);
    ride.actualFare = fareBreakdown.total;
    ride.actualDistance = ride.estimatedDistance;
    ride.actualDuration = actualDuration;
    await ride.save();

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

    driver.currentRideId = null;
    driver.status = 'ONLINE';
    driver.totalTrips += 1;
    driver.totalEarnings += fareBreakdown.driverPayout;
    await driver.save();

    io.to(`user_${ride.passengerId}`).emit('ride:completed', {
        rideId: ride._id,
        fare: fareBreakdown,
        paymentMethod: ride.paymentMethod,
    });

    console.log(`🤖 SimDriver: Ride ${ride._id} completed. Fare: ₹${fareBreakdown.total}`);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { simulateRideFlow };
