const express = require('express');
const router = express.Router();
const {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  getInvoiceStats,
  duplicateInvoice,
  confirmInvoice,
  dispatchInvoice,
  deliverInvoice,
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');
const { checkLimit } = require('../middleware/limitEnforcement');

router.use(protect);

router.get('/stats', getInvoiceStats);

router.route('/')
  .get(getInvoices)
  .post(checkLimit('invoice'), createInvoice);

router.route('/:id')
  .get(getInvoice)
  .put(updateInvoice)
  .delete(authorize('admin', 'manager'), deleteInvoice);

router.patch('/:id/status', updateInvoiceStatus);
router.patch('/:id/confirm', confirmInvoice);
router.patch('/:id/dispatch', dispatchInvoice);
router.patch('/:id/deliver', deliverInvoice);
router.post('/:id/duplicate', duplicateInvoice);

module.exports = router;
