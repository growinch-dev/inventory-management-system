const express = require('express');
const router = express.Router();
const {
  recordScan,
  getScanHistory,
  bulkGenerateQR,
  getScanAnalytics,
} = require('../controllers/qrController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/scan', recordScan);
router.get('/history', getScanHistory);
router.post('/bulk-generate', authorize('admin', 'manager'), bulkGenerateQR);
router.get('/analytics', getScanAnalytics);

module.exports = router;
