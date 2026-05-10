// backend/routes/disputes.routes.js
const express = require('express');
const router = express.Router();
const { createDispute, getAllDisputes, resolveDispute } = require('../controllers/disputes.controller');
const { protect, admin } = require('../middleware/auth.middleware');

console.log('[DEBUG - ROUTE] Đã load file disputes.routes.js thành công!');

// [USER] Báo cáo sự cố (Đóng băng đơn)
router.post('/', protect, createDispute);

// [ADMIN] Quản lý tranh chấp
router.get('/', protect, admin, getAllDisputes);
router.patch('/:id/resolve', protect, admin, resolveDispute);

module.exports = router;