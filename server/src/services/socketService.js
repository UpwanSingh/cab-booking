const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');

/**
 * Socket.IO event handlers
 */
function setupSocketHandlers(io) {
    // Authenticate socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error('Authentication required'));
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.userId} (${socket.userRole})`);

        // Join personal room
        socket.join(`user_${socket.userId}`);

        // Drivers join driver-specific room
        if (socket.userRole === 'DRIVER') {
            socket.join(`driver_${socket.userId}`);
            socket.join('drivers_online');
        }

        // Admin joins admin room
        if (socket.userRole === 'ADMIN') {
            socket.join('admin_room');
        }

        // Driver location update
        socket.on('location:update', async (data) => {
            try {
                const { lat, lng } = data;
                if (!lat || !lng) return;

                // Update driver location in DB
                await Driver.findOneAndUpdate(
                    { userId: socket.userId },
                    { currentLocation: { type: 'Point', coordinates: [lng, lat] } }
                );

                // If driver is on a trip, broadcast to the passenger
                const driver = await Driver.findOne({ userId: socket.userId });
                if (driver && driver.currentRideId) {
                    io.to(`ride_${driver.currentRideId}`).emit('driver:location', { lat, lng, driverId: driver._id });
                }

                // Broadcast to admin room for live monitoring
                io.to('admin_room').emit('driver:location_update', {
                    driverId: driver?._id,
                    userId: socket.userId,
                    lat, lng,
                });
            } catch (err) {
                console.error('Location update error:', err.message);
            }
        });

        // Join ride room
        socket.on('ride:join', (rideId) => {
            socket.join(`ride_${rideId}`);
        });

        // Leave ride room
        socket.on('ride:leave', (rideId) => {
            socket.leave(`ride_${rideId}`);
        });

        // Disconnect
        socket.on('disconnect', async () => {
            console.log(`🔌 Socket disconnected: ${socket.userId}`);
            if (socket.userRole === 'DRIVER') {
                socket.leave('drivers_online');
            }
        });
    });
}

module.exports = { setupSocketHandlers };
