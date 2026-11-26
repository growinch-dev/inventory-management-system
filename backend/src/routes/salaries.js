const express = require('express');
const router = express.Router();
const { getSalaries, createSalary, deleteSalary } = require('../controllers/salaryController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getSalaries)
  .post(authorize('admin', 'manager', 'super_admin'), createSalary);

router.route('/:id')
  .delete(authorize('admin', 'super_admin'), deleteSalary);

module.exports = router;
