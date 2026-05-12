// backend/routes/rentals.routes.js
const express = require('express');
const router = express.Router();
const {
  createRentalRequest,
  createVNPayUrl,
  handleVNPayReturn,
  confirmRental,
  rejectRental,
  completeRental,
  checkRentalOwner,
  signContract,
  pickupItem
} = require('../controllers/rentals.controller');
const { protect, checkVerified } = require('../middleware/auth.middleware');

// POST /api/rentals - (Renter) Tạo yêu cầu
router.post('/', protect, checkVerified, createRentalRequest);

// GET /api/rentals/vnpay-return - VNPay redirect callback
router.get('/vnpay-return', handleVNPayReturn);

// POST /api/rentals/:id/create-vnpay-url - (Renter) Create VNPay payment URL
router.post('/:id/create-vnpay-url', protect, createVNPayUrl);

// PATCH /api/rentals/:id/confirm - (Owner) Xác nhận
router.patch('/:id/confirm', protect, checkRentalOwner, confirmRental);

// PATCH /api/rentals/:id/reject - (Owner) Từ chối
router.patch('/:id/reject', protect, checkRentalOwner, rejectRental);

// PATCH /api/rentals/:id/complete - (Owner hoặc Renter) Hoàn thành
router.patch('/:id/complete', protect, completeRental);

// [CẢ 2 BÊN] Ký hợp đồng điện tử
router.post('/:id/sign-contract', protect, checkVerified, signContract);

// [CẢ 2 BÊN] Chụp ảnh nhận đồ (Chuyển sang in_progress)
router.patch('/:id/pickup', protect, checkVerified, pickupItem);

module.exports = router;
