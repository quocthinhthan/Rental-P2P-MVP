const express = require('express');
const router = express.Router();
const { 
  searchItems, 
  createItem, 
  updateItem, 
  deleteItem, 
  checkOwner,
  getCategories,
  getBestsellerItems
} = require('../controllers/items.controller');

// ĐẶT TRÊN CÙNG ĐỂ KHÔNG BỊ NHẦM VỚI CÁC ROUTE KHÁC
router.get('/categories', getCategories);
router.get('/bestsellers', getBestsellerItems);

const { protect, checkVerified } = require('../middleware/auth.middleware');

// /api/items
router.route('/')
  .get(searchItems) 
  .post(protect, checkVerified, createItem);

// /api/items/:id
router.route('/:id')
  // PUT và DELETE yêu cầu:
  // 1. Đã login (protect)
  // 2. Phải là chủ sở hữu (checkOwner)
  .put(protect, checkOwner, updateItem)
  .delete(protect, checkOwner, deleteItem);

module.exports = router; 