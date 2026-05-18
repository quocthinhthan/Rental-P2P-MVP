// backend/routes/disputes.routes.js
const express = require('express');
const router = express.Router();
const {
  createDispute,
  getAllDisputes,
  resolveDispute,
  withdrawDispute,
  escalateDispute
} = require('../controllers/disputes.controller');
const { protect, admin } = require('../middleware/auth.middleware');

// [USER] Bao cao su co (dong bang don)
router.post('/', protect, createDispute);

// [ADMIN] Quan ly tranh chap
router.get('/', protect, admin, getAllDisputes);
router.patch('/:id/resolve', protect, admin, resolveDispute);

router.patch('/:id/withdraw', protect, withdrawDispute);
router.patch('/:id/escalate', protect, escalateDispute);

module.exports = router;
