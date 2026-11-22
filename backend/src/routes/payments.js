const express = require('express');
const router = express.Router();
const {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  getInvoicePayments,
  getCustomerPayments,
  getPaymentStats,
  getOutstandingDues,
  updateChequeStatus,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Stats and reports (before :id routes)
router.get('/stats', getPaymentStats);
router.get('/outstanding', getOutstandingDues);
router.get('/invoice/:invoiceId', getInvoicePayments);
router.get('/customer/:customerId', getCustomerPayments);

// CRUD routes
router.route('/')
  .get(getPayments)
  .post(authorize('admin', 'manager'), createPayment);

router.route('/:id')
  .get(getPayment)
  .put(authorize('admin', 'manager'), updatePayment)
  .delete(authorize('admin'), deletePayment);

// Cheque status update
router.patch('/:id/cheque-status', authorize('admin', 'manager'), updateChequeStatus);

module.exports = router;
