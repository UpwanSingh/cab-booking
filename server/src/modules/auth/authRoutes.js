const express = require('express');
const router = express.Router();
const { register, login, refreshToken, logout, getMe, walletTopup, updateProfile, guestLogin } = require('./authController');
const { protect } = require('../../core/middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/guest', guestLogin);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.patch('/wallet/topup', protect, walletTopup);
router.patch('/profile', protect, updateProfile);

module.exports = router;

