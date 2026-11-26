const express = require('express');
const router = express.Router();
const {
  getProductions,
  getProduction,
  createProduction,
} = require('../controllers/productionController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getProductions)
  .post(authorize('admin', 'manager'), createProduction);

router.route('/:id')
  .get(getProduction);

module.exports = router;
