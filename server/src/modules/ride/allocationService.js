const Driver = require('../driver/driverModel');
const Vehicle = require('../driver/vehicleModel');
const { haversineDistance } = require('../../core/utils/haversine');

/**
 * Find nearest available driver to a pickup point
 * Uses MongoDB 2dsphere index
 */
async function findNearestDriver(pickupLng, pickupLat, vehicleType, excludeIds = [], maxDistanceKm = 10) {
    // Query using MongoDB's $nearSphere
    const drivers = await Driver.find({
        _id: { $nin: excludeIds },
        status: 'ONLINE',
        approvalStatus: 'APPROVED',
        currentRideId: null,
        currentLocation: {
            $nearSphere: {
                $geometry: { type: 'Point', coordinates: [pickupLng, pickupLat] },
                $maxDistance: maxDistanceKm * 1000, // meters
            },
        },
    })
        .limit(10)
        .populate('vehicleId')
        .populate('userId', 'name phone avatar');

    // Filter by vehicle type
    const filtered = drivers.filter((d) => d.vehicleId && d.vehicleId.category === vehicleType);

    if (filtered.length === 0 && drivers.length > 0) {
        // Fallback: return any available driver regardless of vehicle type
        return drivers[0];
    }

    return filtered.length > 0 ? filtered[0] : null;
}

/**
 * Assign ride to a driver
 * Returns the assigned driver or null
 */
async function assignRide(ride, io) {
    const maxAttempts = 5;
    const excludeIds = [];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const pickupCoords = ride.pickup.location.coordinates; // [lng, lat]
        const driver = await findNearestDriver(
            pickupCoords[0], pickupCoords[1],
            ride.vehicleType, excludeIds
        );

        if (!driver) break;

        // Calculate distance from driver to pickup
        const driverCoords = driver.currentLocation.coordinates;
        const distToPickup = haversineDistance(
            driverCoords[1], driverCoords[0],
            pickupCoords[1], pickupCoords[0]
        );

        // Emit ride request to the specific driver's socket room
        io.to(`driver_${driver.userId._id}`).emit('ride:new_request', {
            rideId: ride._id,
            pickup: ride.pickup,
            drop: ride.drop,
            estimatedFare: ride.estimatedFare,
            vehicleType: ride.vehicleType,
            distanceToPickup: Math.round(distToPickup * 10) / 10,
        });

        // Wait 15 seconds for driver response (in-memory simple approach)
        const accepted = await waitForResponse(ride._id, driver._id, 15000);

        if (accepted) {
            return driver;
        }

        excludeIds.push(driver._id);
    }

    return null;
}

// Simple in-memory response tracker
const pendingResponses = new Map();

function waitForResponse(rideId, driverId, timeoutMs) {
    return new Promise((resolve) => {
        const key = `${rideId}_${driverId}`;
        const timer = setTimeout(() => {
            pendingResponses.delete(key);
            resolve(false);
        }, timeoutMs);

        pendingResponses.set(key, { resolve, timer });
    });
}

function resolveDriverResponse(rideId, driverId, accepted) {
    const key = `${rideId}_${driverId}`;
    const pending = pendingResponses.get(key);
    if (pending) {
        clearTimeout(pending.timer);
        pendingResponses.delete(key);
        pending.resolve(accepted);
    }
}

module.exports = { findNearestDriver, assignRide, resolveDriverResponse };
