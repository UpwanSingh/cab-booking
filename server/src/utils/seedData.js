const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');
const Payment = require('../models/Payment');
const Rating = require('../models/Rating');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cabbooking';

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        // Clear all collections
        await Promise.all([
            User.deleteMany({}), Driver.deleteMany({}), Vehicle.deleteMany({}),
            Ride.deleteMany({}), Payment.deleteMany({}), Rating.deleteMany({}),
        ]);
        console.log('Collections cleared.');

        // Create Admin
        const admin = await User.create({
            name: 'Admin User', phone: '9999000001', email: 'admin@cabbooking.com',
            password: 'admin123', role: 'ADMIN', isVerified: true,
        });
        console.log(`✅ Admin: phone=9999000001, password=admin123`);

        // Create Passengers
        const passengers = await User.create([
            { name: 'Rahul Sharma', phone: '9999000010', email: 'rahul@test.com', password: 'pass123', role: 'PASSENGER', isVerified: true },
            { name: 'Priya Singh', phone: '9999000011', email: 'priya@test.com', password: 'pass123', role: 'PASSENGER', isVerified: true },
            { name: 'Amit Kumar', phone: '9999000012', email: 'amit@test.com', password: 'pass123', role: 'PASSENGER', isVerified: true },
        ]);
        console.log(`✅ 3 Passengers created (phone: 9999000010-12, password: pass123)`);

        // Create Driver Users
        const driverUsers = await User.create([
            { name: 'Suresh Driver', phone: '9999000020', email: 'suresh@test.com', password: 'pass123', role: 'DRIVER', isVerified: true },
            { name: 'Ramesh Driver', phone: '9999000021', email: 'ramesh@test.com', password: 'pass123', role: 'DRIVER', isVerified: true },
            { name: 'Vijay Driver', phone: '9999000022', email: 'vijay@test.com', password: 'pass123', role: 'DRIVER', isVerified: true },
            { name: 'Ajay Driver', phone: '9999000023', email: 'ajay@test.com', password: 'pass123', role: 'DRIVER', isVerified: true },
            { name: 'Manoj Driver', phone: '9999000024', email: 'manoj@test.com', password: 'pass123', role: 'DRIVER', isVerified: true },
        ]);

        // Create Vehicles
        const vehicles = await Vehicle.create([
            { driverId: null, make: 'Maruti', model: 'Swift', year: 2022, color: 'White', plateNumber: 'DL01AB1234', category: 'MINI', capacity: 4 },
            { driverId: null, make: 'Honda', model: 'Amaze', year: 2023, color: 'Silver', plateNumber: 'DL01CD5678', category: 'SEDAN', capacity: 4 },
            { driverId: null, make: 'Toyota', model: 'Innova', year: 2023, color: 'Black', plateNumber: 'DL01EF9012', category: 'SUV', capacity: 6 },
            { driverId: null, make: 'Maruti', model: 'Dzire', year: 2024, color: 'Blue', plateNumber: 'DL01GH3456', category: 'SEDAN', capacity: 4 },
            { driverId: null, make: 'Hyundai', model: 'i20', year: 2023, color: 'Red', plateNumber: 'DL01IJ7890', category: 'MINI', capacity: 4 },
        ]);

        // Delhi area coordinates for drivers
        const delhiLocations = [
            [77.2090, 28.6139],  // Connaught Place
            [77.2295, 28.6129],  // India Gate
            [77.1855, 28.6127],  // Karol Bagh
            [77.2507, 28.5535],  // Nehru Place
            [77.2167, 28.6667],  // Civil Lines
        ];

        // Create Driver profiles
        const drivers = [];
        for (let i = 0; i < driverUsers.length; i++) {
            const driver = await Driver.create({
                userId: driverUsers[i]._id,
                licenseNumber: `DL-${1000 + i}`,
                licenseExpiry: new Date('2028-12-31'),
                vehicleId: vehicles[i]._id,
                status: i < 3 ? 'ONLINE' : 'OFFLINE',
                approvalStatus: 'APPROVED',
                avgRating: 4.0 + Math.random(),
                totalTrips: Math.floor(Math.random() * 200),
                totalEarnings: Math.floor(Math.random() * 50000),
                currentLocation: { type: 'Point', coordinates: delhiLocations[i] },
            });

            vehicles[i].driverId = driver._id;
            await vehicles[i].save();
            drivers.push(driver);
        }
        console.log(`✅ 5 Drivers created (phone: 9999000020-24, password: pass123)`);

        // Create sample completed rides
        const rideData = [
            { pIdx: 0, dIdx: 0, fare: 180, dist: 8.5, dur: 22, vehicleType: 'MINI' },
            { pIdx: 1, dIdx: 1, fare: 320, dist: 12.3, dur: 35, vehicleType: 'SEDAN' },
            { pIdx: 2, dIdx: 2, fare: 550, dist: 18.0, dur: 45, vehicleType: 'SUV' },
            { pIdx: 0, dIdx: 1, fare: 250, dist: 10.0, dur: 28, vehicleType: 'SEDAN' },
            { pIdx: 1, dIdx: 0, fare: 150, dist: 6.0, dur: 18, vehicleType: 'MINI' },
        ];

        for (const rd of rideData) {
            const now = new Date();
            const startedAt = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000);
            const completedAt = new Date(startedAt.getTime() + rd.dur * 60000);

            const ride = await Ride.create({
                passengerId: passengers[rd.pIdx]._id,
                driverId: drivers[rd.dIdx]._id,
                vehicleType: rd.vehicleType,
                pickup: { address: 'Connaught Place, Delhi', location: { type: 'Point', coordinates: [77.2090, 28.6139] } },
                drop: { address: 'India Gate, Delhi', location: { type: 'Point', coordinates: [77.2295, 28.6129] } },
                status: 'COMPLETED',
                estimatedFare: rd.fare,
                actualFare: rd.fare,
                estimatedDistance: rd.dist,
                actualDistance: rd.dist,
                estimatedDuration: rd.dur,
                actualDuration: rd.dur,
                paymentMethod: 'CASH',
                otp: '1234',
                startedAt,
                completedAt,
            });

            await Payment.create({
                rideId: ride._id,
                passengerId: passengers[rd.pIdx]._id,
                driverId: drivers[rd.dIdx]._id,
                amount: rd.fare,
                method: 'CASH',
                status: 'COMPLETED',
                breakdown: { baseFare: 50, distanceCharge: rd.fare - 80, timeCharge: 20, surgeCharge: 0, tax: 10, discount: 0, total: rd.fare },
                driverPayout: Math.round(rd.fare * 0.8),
                platformCommission: Math.round(rd.fare * 0.2),
            });

            await Rating.create({
                rideId: ride._id,
                fromUserId: passengers[rd.pIdx]._id,
                toUserId: driverUsers[rd.dIdx]._id,
                fromRole: 'PASSENGER',
                stars: 4 + Math.round(Math.random()),
                comment: 'Good ride!',
            });
        }
        console.log(`✅ 5 Sample rides with payments and ratings created.`);

        console.log('\n🎉 Seeding complete!\n');
        console.log('=== Login Credentials ===');
        console.log('Admin:     9999000001 / admin123');
        console.log('Passenger: 9999000010 / pass123');
        console.log('Driver:    9999000020 / pass123');
        console.log('========================\n');

        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
}

seed();
