const express = require('express');
const router = express.Router();
const { getItemDetailView, getMyRentalsView, getFinancialStatsView } = require('../controllers/views.controller');
const { protect } = require('../middleware/auth.middleware');

// spec: /views/item-details/{id} (Không cần login)
router.get('/item-details/:id', getItemDetailView);

// spec: /views/my-rentals (Cần login)
router.get('/my-rentals', protect, getMyRentalsView);

// spec: /views/financial-stats (Cần login)
router.get('/financial-stats', protect, getFinancialStatsView);

module.exports = router;