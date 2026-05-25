const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getPublicUserProfile } = require('../controllers/users.controller');
const {
  getFavorites,
  addFavorite,
  removeFavorite
} = require('../controllers/favorites.controller');

// Public profile
router.get('/:id/profile', getPublicUserProfile);

// Wishlist / Favorites (authenticated)
// GET    /api/users/me/favorites            — list favorite items
// POST   /api/users/me/favorites/:itemId    — add to favorites
// DELETE /api/users/me/favorites/:itemId    — remove from favorites
router.get('/me/favorites', protect, getFavorites);
router.post('/me/favorites/:itemId', protect, addFavorite);
router.delete('/me/favorites/:itemId', protect, removeFavorite);

module.exports = router;
