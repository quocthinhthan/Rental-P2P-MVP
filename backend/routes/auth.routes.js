// backend/routes/auth.routes.js
const express = require('express');
const router = express.Router();
// Bổ sung updateProfile
const { registerUser, loginUser, logoutUser, getMe, verifyEKYC, updateProfile } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getMe);

// >>> THÊM ROUTE UPDATE PROFILE <<<
router.put('/profile', protect, updateProfile);

router.post('/verify-ekyc', protect, verifyEKYC);

module.exports = router;