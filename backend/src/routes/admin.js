const express = require('express');
const router = express.Router();
const { getTenants, createTenant } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Platform owner (GrowInch) only.
router.use(protect);
router.use(authorize('super_admin'));

router.route('/tenants')
  .get(getTenants)
  .post(createTenant);

module.exports = router;
