const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getInventoryValue,
  getQRActivity,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/inventory-value', getInventoryValue);
router.get('/qr-activity', getQRActivity);

module.exports = router;
