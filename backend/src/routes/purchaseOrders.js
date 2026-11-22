const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  confirmPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrderStats,
  duplicatePurchaseOrder,
} = require('../controllers/purchaseOrderController');

// Protect all routes
router.use(protect);

// Stats route (must be before :id routes)
router.get('/stats', getPurchaseOrderStats);

// CRUD routes
router.route('/').get(getPurchaseOrders).post(createPurchaseOrder);

router
  .route('/:id')
  .get(getPurchaseOrder)
  .put(updatePurchaseOrder)
  .delete(authorize('admin', 'manager'), deletePurchaseOrder);

// Status/Action routes
router.patch('/:id/confirm', confirmPurchaseOrder);
router.patch('/:id/receive', receivePurchaseOrder);
router.patch('/:id/cancel', cancelPurchaseOrder);
router.post('/:id/duplicate', duplicatePurchaseOrder);

module.exports = router;
