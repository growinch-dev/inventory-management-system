const express = require('express');
const router = express.Router();
const { getInvestments, createInvestment, deleteInvestment } = require('../controllers/investmentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getInvestments)
  .post(authorize('admin', 'manager', 'super_admin'), createInvestment);

router.route('/:id')
  .delete(authorize('admin', 'super_admin'), deleteInvestment);

module.exports = router;
