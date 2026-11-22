const express = require('express');
const router = express.Router();
const {
  getDeliveryChallans,
  getDeliveryChallan,
  createDeliveryChallan,
  updateDeliveryChallan,
  deleteDeliveryChallan,
  dispatchChallan,
  deliverChallan,
  returnItems,
  convertToInvoice,
  getStats,
  getOverdueReturns,
  createFromInvoice,
  createFromDemoIssue,
} = require('../controllers/deliveryChallanController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Stats and reports (before :id routes)
router.get('/stats', getStats);
router.get('/overdue', getOverdueReturns);

// Create from linked documents
router.post('/from-invoice/:invoiceId', authorize('admin', 'manager'), createFromInvoice);
router.post('/from-demo-issue/:demoIssueId', authorize('admin', 'manager'), createFromDemoIssue);

// CRUD routes
router.route('/')
  .get(getDeliveryChallans)
  .post(authorize('admin', 'manager'), createDeliveryChallan);

router.route('/:id')
  .get(getDeliveryChallan)
  .put(authorize('admin', 'manager'), updateDeliveryChallan)
  .delete(authorize('admin'), deleteDeliveryChallan);

// Dispatch, deliver, return operations
router.patch('/:id/dispatch', authorize('admin', 'manager'), dispatchChallan);
router.patch('/:id/deliver', deliverChallan);
router.patch('/:id/return', returnItems);
router.patch('/:id/convert-to-invoice', authorize('admin', 'manager'), convertToInvoice);

module.exports = router;
