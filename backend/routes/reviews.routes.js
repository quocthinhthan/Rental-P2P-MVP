// backend/routes/reviews.routes.js
const express = require('express');
const router = express.Router();
const { createReview, getUserReviews, getItemReviews } = require('../controllers/reviews.controller');
const { protect } = require('../middleware/auth.middleware');

console.log('[DEBUG - ROUTE] Đã load file reviews.routes.js thành công!');

// POST /api/reviews - Đăng đánh giá (cần đăng nhập)
router.post('/', protect, createReview);

// GET /api/reviews/users/:userId - Xem đánh giá của một User (Ai cũng xem được)
router.get('/users/:userId', getUserReviews);

// GET /api/reviews/items/:itemId - Xem đánh giá của một sản phẩm (Ai cũng xem được)
router.get('/items/:itemId', getItemReviews);

module.exports = router;