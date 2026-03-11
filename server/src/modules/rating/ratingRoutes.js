const express = require('express');
const router = express.Router();
const { protect } = require('../../core/middleware/auth');
const { createRating, getUserRatings } = require('./ratingController');

router.post('/', protect, createRating);
router.get('/user/:id', protect, getUserRatings);

module.exports = router;
