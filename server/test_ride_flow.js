const axios = require('axios');
const mongoose = require('mongoose');

const API = 'http://localhost:5001/api/v1';

async function run() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/cab-booking');

        // 1. Wait for ride to be created
        let rideDoc = null;
        console.log('Waiting for a REQUESTED ride...');
        while (!rideDoc) {
            rideDoc = await mongoose.connection.collection('rides').findOne({ status: 'REQUESTED' });
            if (!rideDoc) await new Promise(r => setTimeout(r, 2000));
        }

        const rideId = rideDoc._id.toString();
        console.log('Found requested ride:', rideId);

        // 2. Put our driver near the pickup so allocationService finds them!
        const driver = await mongoose.connection.collection('drivers').findOne({ status: 'ONLINE' });
        if (!driver) {
            console.log('No online drivers found!');
            return process.exit(1);
        }
        await mongoose.connection.collection('drivers').updateOne(
            { _id: driver._id },
            { $set: { location: { type: 'Point', coordinates: [rideDoc.pickup.lng, rideDoc.pickup.lat] } } }
        );
        console.log('Moved driver to pickup location.');

        // Wait a bit for allocation service to assign it to this driver
        await new Promise(r => setTimeout(r, 3000));

        // Let's get driver token to accept
        const user = await mongoose.connection.collection('users').findOne({ _id: driver.userId });
        const loginRes = await axios.post(`${API}/auth/login`, { phone: user.phone, password: 'pass123' });
        const driverToken = loginRes.data.data.accessToken;
        const headers = { Authorization: `Bearer ${driverToken}` };
        
        console.log('Accepting ride as driver:', user.name);
        await axios.post(`${API}/rides/${rideId}/accept`, {}, { headers });
        await new Promise(r => setTimeout(r, 2000));

        console.log('Arriving...');
        await axios.patch(`${API}/rides/${rideId}/status`, { status: 'ARRIVED' }, { headers });
        await new Promise(r => setTimeout(r, 3000));
        
        console.log('Starting...');
        // get latest ride doc for OTP
        const freshRide = await mongoose.connection.collection('rides').findOne({ _id: rideDoc._id });
        await axios.patch(`${API}/rides/${rideId}/status`, { status: 'STARTED', otp: freshRide.otp }, { headers });
        await new Promise(r => setTimeout(r, 4000));

        console.log('Completing...');
        await axios.patch(`${API}/rides/${rideId}/status`, { status: 'COMPLETED' }, { headers });
        
        console.log('Done!');
        process.exit(0);
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
        process.exit(1);
    }
}

run();
