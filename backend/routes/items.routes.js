const express = require('express');
const router = express.Router();
const { 
  searchItems, 
  createItem, 
  updateItem, 
  deleteItem, 
  checkOwner, // Import middleware
  getCategories
} = require('../controllers/items.controller');

// ĐẶT TRÊN CÙNG ĐỂ KHÔNG BỊ NHẦM VỚI CÁC ROUTE KHÁC
router.get('/categories', getCategories);

const { protect } = require('../middleware/auth.middleware');

// /api/items
router.route('/')
  .get(searchItems) // GET /api/items?search=...
  .post(protect, createItem); // POST /api/items (cần login)

// /api/items/:id
router.route('/:id')
  // PUT và DELETE yêu cầu:
  // 1. Đã login (protect)
  // 2. Phải là chủ sở hữu (checkOwner)
  .put(protect, checkOwner, updateItem)
  .delete(protect, checkOwner, deleteItem);

module.exports = router;