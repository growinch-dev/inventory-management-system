const express = require('express');
const router = express.Router();
const {
  getPlans,
  getCurrentSubscription,
  subscribe,
  changePlan,
  cancelSubscription,
  getInvoices,
  validateCoupon,
  getUsage,
  handleWebhook,
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenantMiddleware');

// Public routes
router.get('/plans', getPlans);
router.post('/webhook', handleWebhook); // Razorpay webhook

// Protected routes (require auth + tenant)
router.use(protect);
router.use(tenantMiddleware);

router.get('/current', getCurrentSubscription);
router.get('/usage', getUsage);
router.get('/invoices', getInvoices);
router.post('/subscribe', subscribe);
router.put('/change-plan', changePlan);
router.post('/cancel', cancelSubscription);
router.post('/validate-coupon', validateCoupon);

module.exports = router;
