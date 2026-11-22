import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Package,
  Clock,
  ShoppingCart,
  FileText,
  ArrowRightLeft,
  Settings,
} from 'lucide-react';
import { notificationsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { Badge } from './ui';

const NotificationCenter = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.data.data.count);
    } catch (error) {
      console.error('Failed to fetch unread count');
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationsAPI.getAll({ limit: 10 });
      setNotifications(response.data.data.notifications);
      setUnreadCount(response.data.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (error) {
      console.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'low_stock':
      case 'out_of_stock':
        return <Package className="text-warning" size={18} />;
      case 'expiry_alert':
        return <Clock className="text-warning" size={18} />;
      case 'expired':
        return <AlertTriangle className="text-danger" size={18} />;
      case 'po_received':
        return <ShoppingCart className="text-success" size={18} />;
      case 'invoice_overdue':
        return <FileText className="text-danger" size={18} />;
      case 'transfer_completed':
        return <ArrowRightLeft className="text-info" size={18} />;
      default:
        return <Bell className="text-primary" size={18} />;
    }
  };

  const getNotificationLink = (notification) => {
    switch (notification.referenceType) {
      case 'product':
        return `/products/${notification.referenceId}`;
      case 'batch':
        return `/products`; // Could link to batch details page
      case 'purchase_order':
        return `/purchase-orders/${notification.referenceId}`;
      case 'invoice':
        return `/invoices/${notification.referenceId}`;
      case 'transfer':
        return `/transfers`;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'border-l-danger';
      case 'high':
        return 'border-l-warning';
      case 'medium':
        return 'border-l-info';
      default:
        return 'border-l-secondary-200';
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-xl transition-colors"
        aria-label="View notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-danger text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-secondary-100 overflow-hidden z-50 animate-scale-in origin-top-right">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-100 bg-secondary-50">
            <h3 className="font-semibold text-secondary">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:text-primary-dark flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
              <Link
                to="/settings"
                className="p-1 text-secondary-400 hover:text-secondary-600 rounded"
                title="Notification settings"
                onClick={() => setIsOpen(false)}
              >
                <Settings size={16} />
              </Link>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-secondary-400">
                <Bell size={32} className="mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <ul className="divide-y divide-secondary-100">
                {notifications.map((notification) => {
                  const link = getNotificationLink(notification);
                  const NotificationContent = (
                    <>
                      <div className="w-10 h-10 rounded-lg bg-secondary-50 flex items-center justify-center flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.read ? 'text-secondary-600' : 'text-secondary font-medium'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-secondary-500 line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-secondary-400 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {!notification.read && (
                          <span className="w-2 h-2 bg-primary rounded-full" />
                        )}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                              className="p-1 text-secondary-400 hover:text-success rounded"
                              title="Mark as read"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteNotification(notification._id);
                            }}
                            className="p-1 text-secondary-400 hover:text-danger rounded"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </>
                  );

                  return (
                    <li key={notification._id}>
                      {link ? (
                        <Link
                          to={link}
                          onClick={() => {
                            if (!notification.read) markAsRead(notification._id);
                            setIsOpen(false);
                          }}
                          className={`group flex items-start gap-3 px-4 py-3 hover:bg-secondary-50 transition-colors border-l-4 ${getPriorityColor(notification.priority)} ${
                            !notification.read ? 'bg-primary-50/30' : ''
                          }`}
                        >
                          {NotificationContent}
                        </Link>
                      ) : (
                        <div
                          className={`group flex items-start gap-3 px-4 py-3 border-l-4 ${getPriorityColor(notification.priority)} ${
                            !notification.read ? 'bg-primary-50/30' : ''
                          }`}
                        >
                          {NotificationContent}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-secondary-100 px-4 py-2 bg-secondary-50">
              <Link
                to="/notifications"
                className="text-sm text-primary hover:text-primary-dark font-medium"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
