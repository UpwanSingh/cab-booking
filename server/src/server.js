require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const { Server } = require('socket.io');

const connectDB = require('./core/config/db');
const { setupSocketHandlers } = require('./core/services/socketService');
const errorHandler = require('./core/middleware/errorHandler');

// Route imports
const authRoutes = require('./modules/auth/authRoutes');
const rideRoutes = require('./modules/ride/rideRoutes');
const driverRoutes = require('./modules/driver/driverRoutes');
const adminRoutes = require('./modules/admin/adminRoutes');
const paymentRoutes = require('./modules/payment/paymentRoutes');
const ratingRoutes = require('./modules/rating/ratingRoutes');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'https://cab-booking-sooty-eight.vercel.app'
].filter(Boolean);

// Socket.IO
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Data Sanitization against NoSQL query injection
app.use(mongoSanitize());
// Data Sanitization against XSS
app.use(xss());
// Prevent HTTP Parameter Pollution
app.use(hpp());

// Global Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Limit each IP to 300 requests per window
    message: { success: false, error: { message: 'Too many requests from this IP, please try again later.' } },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// Strict Rate Limiting for Booking & Auth endpoints to prevent spam
const strictLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: { success: false, error: { message: 'Too many rapid requests. Please slow down.' } },
});
app.use('/api/v1/rides/request', strictLimiter);
app.use('/api/v1/auth', strictLimiter);

// Routes
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Cab Booking API is running 🚕', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/rides', rideRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/ratings', ratingRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: { message: `Route ${req.originalUrl} not found` } });
});

// Error handler
app.use(errorHandler);

// Socket.IO handlers
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = { app, server, io };
