const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getBatches,
  getBatch,
  getProductBatches,
  createBatch,
  updateBatch,
  getExpiryAlerts,
  markAsExpired,
  quarantineBatch,
  getBatchStats,
  selectBatchesFIFO,
} = require('../controllers/batchController');

// Protect all routes
router.use(protect);

// Stats and alerts (must be before :id routes)
router.get('/stats', getBatchStats);
router.get('/expiry/alerts', getExpiryAlerts);

// FIFO selection
router.post('/select-fifo', selectBatchesFIFO);

// CRUD routes
router.route('/').get(getBatches).post(createBatch);

router.route('/:id').get(getBatch).put(updateBatch);

// Status routes
router.patch('/:id/expire', markAsExpired);
router.patch('/:id/quarantine', quarantineBatch);

module.exports = router;

// Also export a sub-router for product batches
const productBatchRouter = express.Router({ mergeParams: true });
productBatchRouter.use(protect);
productBatchRouter.get('/', getProductBatches);

module.exports.productBatchRouter = productBatchRouter;
