const express = require('express');
const router = express.Router();
const {
  getTenders,
  getTender,
  createTender,
  updateTender,
  deleteTender,
  updateStatus,
  updateEmd,
  updateSecurityDeposit,
  addSupplyOrder,
  updateSupplyOrder,
  addPayment,
  getStats,
  getEmdReport,
  getSecurityDepositReport,
  getPendingSupplyReport,
} = require('../controllers/tenderController');
const { protect, authorize } = require('../middleware/auth');
const { checkFeature } = require('../middleware/limitEnforcement');

router.use(protect);

// Stats and reports (before :id routes)
router.get('/stats', getStats);
router.get('/reports/emd', getEmdReport);
router.get('/reports/security-deposit', getSecurityDepositReport);
router.get('/reports/pending-supply', getPendingSupplyReport);

// CRUD routes
router.route('/')
  .get(checkFeature('tenderManagement'), getTenders)
  .post(authorize('admin', 'manager'), checkFeature('tenderManagement'), createTender);

router.route('/:id')
  .get(getTender)
  .put(authorize('admin', 'manager'), updateTender)
  .delete(authorize('admin'), deleteTender);

// Status and deposit updates
router.patch('/:id/status', authorize('admin', 'manager'), updateStatus);
router.patch('/:id/emd', authorize('admin', 'manager'), updateEmd);
router.patch('/:id/security-deposit', authorize('admin', 'manager'), updateSecurityDeposit);

// Supply orders
router.post('/:id/supply', authorize('admin', 'manager'), addSupplyOrder);
router.patch('/:id/supply/:supplyId', authorize('admin', 'manager'), updateSupplyOrder);

// Payments
router.post('/:id/payment', authorize('admin', 'manager'), addPayment);

module.exports = router;
