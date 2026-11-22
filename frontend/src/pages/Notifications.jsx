import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Package,
  Clock,
  ShoppingCart,
  FileText,
  ArrowRightLeft,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { notificationsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { PageHeader, Card, Badge, Button, EmptyState, LoadingSpinner } from '../components/ui';
import toast from 'react-hot-toast';

const Notifications = () => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, type
  const [typeFilter, setTypeFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    fetchNotifications();
  }, [filter, typeFilter, pagination.page]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 20,
      };

      if (filter === 'unread') {
        params.unreadOnly = 'true';
      }

      if (typeFilter) {
        params.type = typeFilter;
      }

      const response = await notificationsAPI.getAll(params);
      setNotifications(response.data.data.notifications);
      setPagination({
        page: response.data.data.pagination.page,
        pages: response.data.data.pagination.pages,
        total: response.data.data.pagination.total,
      });
    } catch (error) {
      toast.error('Failed to load notifications');
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
      toast.success('Marked as read');
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const clearAllRead = async () => {
    try {
      await notificationsAPI.clearRead();
      setNotifications((prev) => prev.filter((n) => !n.read));
      toast.success('Read notifications cleared');
    } catch (error) {
      toast.error('Failed to clear notifications');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'low_stock':
      case 'out_of_stock':
        return <Package className="text-warning" size={20} />;
      case 'expiry_alert':
        return <Clock className="text-warning" size={20} />;
      case 'expired':
        return <AlertTriangle className="text-danger" size={20} />;
      case 'po_received':
        return <ShoppingCart className="text-success" size={20} />;
      case 'invoice_overdue':
        return <FileText className="text-danger" size={20} />;
      case 'transfer_completed':
        return <ArrowRightLeft className="text-info" size={20} />;
      default:
        return <Bell className="text-primary" size={20} />;
    }
  };

  const getNotificationLink = (notification) => {
    switch (notification.referenceType) {
      case 'product':
        return `/products/${notification.referenceId}`;
      case 'batch':
        return `/products`;
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

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="danger" size="sm">Critical</Badge>;
      case 'high':
        return <Badge variant="warning" size="sm">High</Badge>;
      case 'medium':
        return <Badge variant="info" size="sm">Medium</Badge>;
      default:
        return <Badge variant="gray" size="sm">Low</Badge>;
    }
  };

  const getTypeBadge = (type) => {
    const labels = {
      low_stock: 'Low Stock',
      out_of_stock: 'Out of Stock',
      expiry_alert: 'Expiry Alert',
      expired: 'Expired',
      po_received: 'PO Received',
      invoice_overdue: 'Invoice Overdue',
      transfer_completed: 'Transfer',
      system: 'System',
    };
    return labels[type] || type;
  };

  const notificationTypes = [
    { value: '', label: 'All Types' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' },
    { value: 'expiry_alert', label: 'Expiry Alert' },
    { value: 'expired', label: 'Expired' },
    { value: 'po_received', label: 'PO Received' },
    { value: 'invoice_overdue', label: 'Invoice Overdue' },
    { value: 'transfer_completed', label: 'Transfer' },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('notifications.title') || 'Notifications'}
        subtitle={t('notifications.subtitle') || 'View and manage your alerts'}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchNotifications} icon={RefreshCw}>
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={markAllAsRead} icon={CheckCheck}>
                Mark All Read
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearAllRead} icon={Trash2}>
              Clear Read
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <Card.Content className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-secondary-400" />
              <span className="text-sm font-medium text-secondary">Filter:</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === 'unread'
                    ? 'bg-primary text-white'
                    : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                }`}
              >
                Unread
              </button>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="select text-sm py-1.5"
            >
              {notificationTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <span className="text-sm text-secondary-500 ml-auto">
              {pagination.total} notification{pagination.total !== 1 ? 's' : ''}
            </span>
          </div>
        </Card.Content>
      </Card>

      {/* Notifications List */}
      <Card>
        <Card.Content className="p-0">
          {loading ? (
            <LoadingSpinner.Page />
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications"
              description={
                filter === 'unread'
                  ? 'You have no unread notifications'
                  : 'You have no notifications yet'
              }
            />
          ) : (
            <ul className="divide-y divide-secondary-100">
              {notifications.map((notification) => {
                const link = getNotificationLink(notification);

                return (
                  <li
                    key={notification._id}
                    className={`flex items-start gap-4 p-4 hover:bg-secondary-50 transition-colors ${
                      !notification.read ? 'bg-primary-50/30' : ''
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className={`text-sm ${notification.read ? 'text-secondary-600' : 'text-secondary font-semibold'}`}>
                            {notification.title}
                          </h4>
                          <p className="text-sm text-secondary-500 mt-1">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getPriorityBadge(notification.priority)}
                          {!notification.read && (
                            <span className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="gray" size="sm">
                          {getTypeBadge(notification.type)}
                        </Badge>
                        <span className="text-xs text-secondary-400">
                          {new Date(notification.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {link && (
                          <Link
                            to={link}
                            className="text-xs text-primary hover:text-primary-dark font-medium"
                          >
                            View Details
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification._id)}
                          className="p-2 text-secondary-400 hover:text-success hover:bg-success-light rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification._id)}
                        className="p-2 text-secondary-400 hover:text-danger hover:bg-danger-light rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card.Content>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <Card.Footer className="flex items-center justify-between">
            <span className="text-sm text-secondary-500">
              Page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </Card.Footer>
        )}
      </Card>
    </div>
  );
};

export default Notifications;
