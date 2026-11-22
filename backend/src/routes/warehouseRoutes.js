const express = require('express');
const router = express.Router();
const {
  getWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseStats,
  getWarehouseList,
} = require('../controllers/warehouseController');
const { protect, authorize } = require('../middleware/auth');
const { checkLimit, checkFeature } = require('../middleware/limitEnforcement');

// All routes require authentication
router.use(protect);

// Get list for dropdowns (before :id route)
router.get('/list', getWarehouseList);

// Standard CRUD routes
router.route('/')
  .get(getWarehouses)
  .post(authorize('admin', 'manager'), checkFeature('multiWarehouse'), checkLimit('warehouse'), createWarehouse);

router.route('/:id')
  .get(getWarehouse)
  .put(authorize('admin', 'manager'), updateWarehouse)
  .delete(authorize('admin'), deleteWarehouse);

// Stats route
router.get('/:id/stats', getWarehouseStats);

module.exports = router;
