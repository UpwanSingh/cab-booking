const FARE_CONFIG = {
    MINI: { baseFare: 30, perKmRate: 8, perMinRate: 1.5 },
    SEDAN: { baseFare: 50, perKmRate: 12, perMinRate: 2.0 },
    SUV: { baseFare: 80, perKmRate: 16, perMinRate: 2.5 },
    PREMIUM: { baseFare: 120, perKmRate: 22, perMinRate: 3.5 },
};

const TAX_RATE = 0.05; // 5% GST
const PLATFORM_COMMISSION = 0.20; // 20%

/**
 * Calculate fare estimate
 */
function calculateFare(distanceKm, durationMin, vehicleType, surgeMultiplier = 1.0) {
    const config = FARE_CONFIG[vehicleType] || FARE_CONFIG.SEDAN;

    const baseFare = config.baseFare;
    const distanceCharge = Math.round(distanceKm * config.perKmRate);
    const timeCharge = Math.round(durationMin * config.perMinRate);
    const subtotal = baseFare + distanceCharge + timeCharge;
    const surgeCharge = Math.round(subtotal * (surgeMultiplier - 1));
    const tax = Math.round((subtotal + surgeCharge) * TAX_RATE);
    const total = subtotal + surgeCharge + tax;

    return {
        baseFare,
        distanceCharge,
        timeCharge,
        surgeCharge,
        tax,
        discount: 0,
        total,
        driverPayout: Math.round(total * (1 - PLATFORM_COMMISSION)),
        platformCommission: Math.round(total * PLATFORM_COMMISSION),
    };
}

/**
 * Estimate distance and duration between two points (simplified — straight line + factor)
 */
function estimateDistanceAndDuration(pickupLat, pickupLng, dropLat, dropLng) {
    const { haversineDistance } = require('../utils/haversine');
    const straightDist = haversineDistance(pickupLat, pickupLng, dropLat, dropLng);
    // Road distance is roughly 1.3x straight line distance
    const distanceKm = Math.round(straightDist * 1.3 * 10) / 10;
    // Avg city speed: ~25 km/h
    const durationMin = Math.round((distanceKm / 25) * 60);
    return { distanceKm, durationMin };
}

/**
 * Get fare estimates for all vehicle types
 */
function getAllFareEstimates(pickupLat, pickupLng, dropLat, dropLng, surgeMultiplier = 1.0) {
    const { distanceKm, durationMin } = estimateDistanceAndDuration(pickupLat, pickupLng, dropLat, dropLng);
    const estimates = {};
    for (const type of Object.keys(FARE_CONFIG)) {
        estimates[type] = {
            ...calculateFare(distanceKm, durationMin, type, surgeMultiplier),
            distanceKm,
            durationMin,
        };
    }
    return estimates;
}

module.exports = { calculateFare, estimateDistanceAndDuration, getAllFareEstimates, FARE_CONFIG };
