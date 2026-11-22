const Notification = require('../models/Notification');
const { runAlertChecks } = require('../services/notificationService');

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false, type } = req.query;

    const query = { user: req.user._id, tenant: req.user.tenant };

    if (unreadOnly === 'true') {
      query.read = false;
    }

    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(query),
      Notification.getUnreadCount(req.user._id, req.user.tenant),
    ]);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id, req.user.tenant);

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
      tenant: req.user.tenant,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.markAllAsRead(req.user._id, req.user.tenant);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
      tenant: req.user.tenant,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/clear-read
// @access  Private
exports.clearReadNotifications = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({
      user: req.user._id,
      read: true,
      tenant: req.user.tenant,
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} notifications cleared`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger alert check (admin only)
// @route   POST /api/notifications/trigger-alerts
// @access  Private/Admin
exports.triggerAlertCheck = async (req, res, next) => {
  try {
    // Run alert checks in background
    runAlertChecks(req.user.tenant);

    res.status(200).json({
      success: true,
      message: 'Alert check triggered. Notifications will be created shortly.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notification stats
// @route   GET /api/notifications/stats
// @access  Private
exports.getNotificationStats = async (req, res, next) => {
  try {
    const stats = await Notification.aggregate([
      { $match: { user: req.user._id, tenant: req.user.tenant } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unread: { $sum: { $cond: ['$read', 0, 1] } },
        },
      },
    ]);

    const totalUnread = await Notification.getUnreadCount(req.user._id, req.user.tenant);

    res.status(200).json({
      success: true,
      data: {
        byType: stats,
        totalUnread,
      },
    });
  } catch (error) {
    next(error);
  }
};
