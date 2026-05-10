// backend/routes/reviews.routes.js
const express = require('express');
const router = express.Router();
const { createReview, getUserReviews } = require('../controllers/reviews.controller');
const { protect } = require('../middleware/auth.middleware');

console.log('[DEBUG - ROUTE] Đã load file reviews.routes.js thành công!');

// POST /api/reviews - Đăng đánh giá (cần đăng nhập)
router.post('/', protect, createReview);

// GET /api/reviews/users/:userId - Xem đánh giá của một User (Ai cũng xem được)
router.get('/users/:userId', getUserReviews);

module.exports = router;