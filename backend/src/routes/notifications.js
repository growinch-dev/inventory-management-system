const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  triggerAlertCheck,
  getNotificationStats,
} = require('../controllers/notificationController');

// All routes require authentication
router.use(protect);

// Notification routes
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/stats', getNotificationStats);
router.patch('/read-all', markAllAsRead);
router.delete('/clear-read', clearReadNotifications);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

// Admin only
router.post('/trigger-alerts', authorize('admin'), triggerAlertCheck);

module.exports = router;
