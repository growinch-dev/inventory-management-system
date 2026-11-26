const express = require('express');
const router = express.Router();
const { getTenant, updateTenant, getTenantBySlug } = require('../controllers/tenantController');
const { protect, authorize } = require('../middleware/auth');

// Public: branding for the per-customer login page (no auth).
router.get('/by-slug/:slug', getTenantBySlug);

router.use(protect);

router.route('/')
  .get(getTenant)
  .put(authorize('admin', 'super_admin'), updateTenant);

module.exports = router;
