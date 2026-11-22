const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getProductBySku,
  regenerateQR,
  getLowStockProducts,
  getStockMovements,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { checkLimit } = require('../middleware/limitEnforcement');

router.use(protect);

router.get('/low-stock', getLowStockProducts);
router.get('/sku/:sku', getProductBySku);

router.route('/')
  .get(getProducts)
  .post(authorize('admin', 'manager'), checkLimit('product'), createProduct);

router.route('/:id')
  .get(getProduct)
  .put(authorize('admin', 'manager'), updateProduct)
  .delete(authorize('admin'), deleteProduct);

router.post('/:id/stock', updateStock);
router.post('/:id/regenerate-qr', authorize('admin', 'manager'), regenerateQR);
router.get('/:id/movements', getStockMovements);

module.exports = router;
