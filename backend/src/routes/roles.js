const express = require('express');
const router = express.Router();
const { getRoles, createRole, updateRole, deleteRole } = require('../controllers/roleController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getRoles)
  .post(authorize('admin', 'super_admin'), createRole);

router.route('/:id')
  .put(authorize('admin', 'super_admin'), updateRole)
  .delete(authorize('admin', 'super_admin'), deleteRole);

module.exports = router;
