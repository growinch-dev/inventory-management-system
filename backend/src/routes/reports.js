const express = require('express');
const router = express.Router();
const {
  getSalesReport,
  getPurchaseReport,
  getPaymentReport,
  getTenderReport,
  getInventoryReport,
  getMovementReport,
  getExpiryReport,
  getProfitLossReport,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Reports - accessible by admin and manager
router.get('/sales', authorize('admin', 'manager'), getSalesReport);
router.get('/purchases', authorize('admin', 'manager'), getPurchaseReport);
router.get('/payments', authorize('admin', 'manager'), getPaymentReport);
router.get('/tenders', authorize('admin', 'manager'), getTenderReport);
router.get('/inventory', authorize('admin', 'manager', 'staff'), getInventoryReport);
router.get('/movements', authorize('admin', 'manager', 'staff'), getMovementReport);
router.get('/expiry', authorize('admin', 'manager', 'staff'), getExpiryReport);
router.get('/profit-loss', authorize('admin'), getProfitLossReport);

module.exports = router;
