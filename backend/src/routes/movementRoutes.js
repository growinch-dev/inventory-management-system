const express = require('express');
const router = express.Router();
const {
  getMovements,
  getProductMovements,
  getMovementStats,
  exportMovements,
} = require('../controllers/movementController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Stats and export routes (before :id routes)
router.get('/stats', getMovementStats);
router.get('/export', exportMovements);

// Product-specific movements
router.get('/product/:productId', getProductMovements);

// Main movements route
router.get('/', getMovements);

module.exports = router;
