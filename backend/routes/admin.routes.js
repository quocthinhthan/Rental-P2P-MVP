// backend/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  updateUserStatus,
  updateItemStatus,
  getDashboardOverview,
  getDashboardCharts,
  getTopItems,
  getTopUsers,
  getAdminItems,
  getAdminItemDetail,
  updateItemFeature,
  getItemReports,
  resolveItemReport
} = require('../controllers/admin.controller');
const { protect, admin } = require('../middleware/auth.middleware');

// Tất cả các route admin đều cần protect và check admin
router.use(protect, admin);

// GET /api/admin/users
router.get('/users', getAllUsers);

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', updateUserStatus);

// Dashboard APIs
router.get('/dashboard/overview', getDashboardOverview);
router.get('/dashboard/charts', getDashboardCharts);
router.get('/dashboard/top-items', getTopItems);
router.get('/dashboard/top-users', getTopUsers);

// Item report management
router.get('/item-reports', getItemReports);
router.patch('/item-reports/:reportId/resolve', resolveItemReport);

// Admin item management
router.get('/items', getAdminItems);
router.get('/items/:id', getAdminItemDetail);

// PATCH /api/admin/items/:id/status
router.patch('/items/:id/status', updateItemStatus);

// PATCH /api/admin/items/:id/feature
router.patch('/items/:id/feature', updateItemFeature);

module.exports = router;
