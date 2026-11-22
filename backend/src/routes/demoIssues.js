const express = require('express');
const router = express.Router();
const {
  getDemoIssues,
  getDemoIssue,
  createDemoIssue,
  updateDemoIssue,
  deleteDemoIssue,
  issueDemoItems,
  returnDemoItems,
  extendReturnDate,
  getStats,
  getOverdue,
  updateFollowUp,
} = require('../controllers/demoIssueController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Stats and reports (before :id routes)
router.get('/stats', getStats);
router.get('/overdue', getOverdue);

// CRUD routes
router.route('/')
  .get(getDemoIssues)
  .post(authorize('admin', 'manager'), createDemoIssue);

router.route('/:id')
  .get(getDemoIssue)
  .put(authorize('admin', 'manager'), updateDemoIssue)
  .delete(authorize('admin'), deleteDemoIssue);

// Issue and return operations
router.patch('/:id/issue', authorize('admin', 'manager'), issueDemoItems);
router.patch('/:id/return', returnDemoItems);
router.patch('/:id/extend', authorize('admin', 'manager'), extendReturnDate);
router.patch('/:id/follow-up', updateFollowUp);

module.exports = router;
