const express = require('express');
const router = express.Router();
const {
  getTransfers,
  getTransfer,
  createTransfer,
  shipTransfer,
  receiveTransfer,
  cancelTransfer,
  getTransferStats,
} = require('../controllers/transferController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Stats route (before :id)
router.get('/stats', getTransferStats);

// Standard CRUD routes
router.route('/')
  .get(getTransfers)
  .post(authorize('admin', 'manager'), createTransfer);

router.route('/:id')
  .get(getTransfer);

// Status update routes
router.put('/:id/ship', authorize('admin', 'manager'), shipTransfer);
router.put('/:id/receive', receiveTransfer);
router.put('/:id/cancel', authorize('admin', 'manager'), cancelTransfer);

module.exports = router;
