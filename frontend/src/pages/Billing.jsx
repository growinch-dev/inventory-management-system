import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Package,
  Users,
  FileText,
  Warehouse,
  TrendingUp,
  AlertTriangle,
  Check,
  Loader2,
  Calendar,
  Download,
  ArrowUpRight,
} from 'lucide-react';
import { subscriptionsAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const Billing = () => {
  const { tenant } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [payments, setPayments] = useState([]);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const [subRes, usageRes] = await Promise.all([
        subscriptionsAPI.getCurrentSubscription(),
        subscriptionsAPI.getUsage(),
      ]);
      setSubscription(subRes.data.data);
      setUsage(usageRes.data.data);

      try {
        const paymentsRes = await subscriptionsAPI.getPaymentHistory();
        setPayments(paymentsRes.data.data || []);
      } catch (e) {
        // Payment history might not be available
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return;
    }

    try {
      setCancelling(true);
      await subscriptionsAPI.cancelSubscription();
      toast.success('Subscription cancelled. You will have access until the end of your billing period.');
      fetchBillingData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      trialing: 'bg-blue-100 text-blue-700',
      past_due: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
      inactive: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`}>
        {status?.replace('_', ' ').charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
      </span>
    );
  };

  const getUsagePercentage = (used, limit) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min(100, Math.round((used / limit) * 100));
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-primary';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-heading font-bold text-secondary">
            Billing & Subscription
          </h1>
          <p className="text-gray-500">Manage your subscription and view usage</p>
        </div>
        <Link to="/pricing" className="btn-primary">
          <TrendingUp size={18} className="mr-2" />
          Upgrade Plan
        </Link>
      </div>

      {/* Current Plan Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-lg font-semibold text-secondary">
                {subscription?.plan?.charAt(0).toUpperCase() + subscription?.plan?.slice(1)} Plan
              </h2>
              {getStatusBadge(subscription?.status)}
            </div>
            <p className="text-gray-500 text-sm">
              {subscription?.status === 'trialing' ? (
                <>
                  Trial ends on{' '}
                  <span className="font-medium text-secondary">
                    {new Date(subscription?.trialEndsAt).toLocaleDateString()}
                  </span>
                </>
              ) : subscription?.currentPeriodEnd ? (
                <>
                  Next billing date:{' '}
                  <span className="font-medium text-secondary">
                    {new Date(subscription?.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </>
              ) : (
                'Free plan - no billing'
              )}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-secondary">
              {subscription?.price === 0 ? (
                'Free'
              ) : (
                <>₹{subscription?.price?.toLocaleString()}<span className="text-sm font-normal text-gray-500">/{subscription?.billingCycle}</span></>
              )}
            </div>
          </div>
        </div>

        {subscription?.status === 'past_due' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium text-red-700">Payment Failed</p>
              <p className="text-sm text-red-600">
                Your last payment failed. Please update your payment method to continue using premium features.
              </p>
            </div>
          </div>
        )}

        {subscription?.plan !== 'free' && subscription?.status !== 'cancelled' && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
            <Link to="/pricing" className="text-sm text-primary hover:underline">
              Change Plan
            </Link>
            <button
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="text-sm text-red-500 hover:underline"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
            </button>
          </div>
        )}
      </div>

      {/* Usage Overview */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Usage Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-secondary">Products</span>
              </div>
              <span className="text-sm text-gray-500">
                {usage?.products?.used || 0} / {usage?.products?.limit === -1 ? '∞' : usage?.products?.limit}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getUsageColor(getUsagePercentage(usage?.products?.used, usage?.products?.limit))} transition-all`}
                style={{ width: `${getUsagePercentage(usage?.products?.used, usage?.products?.limit)}%` }}
              />
            </div>
          </div>

          {/* Users */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-secondary">Users</span>
              </div>
              <span className="text-sm text-gray-500">
                {usage?.users?.used || 0} / {usage?.users?.limit === -1 ? '∞' : usage?.users?.limit}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getUsageColor(getUsagePercentage(usage?.users?.used, usage?.users?.limit))} transition-all`}
                style={{ width: `${getUsagePercentage(usage?.users?.used, usage?.users?.limit)}%` }}
              />
            </div>
          </div>

          {/* Invoices */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-secondary">Invoices (this month)</span>
              </div>
              <span className="text-sm text-gray-500">
                {usage?.invoices?.used || 0} / {usage?.invoices?.limit === -1 ? '∞' : usage?.invoices?.limit}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getUsageColor(getUsagePercentage(usage?.invoices?.used, usage?.invoices?.limit))} transition-all`}
                style={{ width: `${getUsagePercentage(usage?.invoices?.used, usage?.invoices?.limit)}%` }}
              />
            </div>
          </div>

          {/* Warehouses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Warehouse size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-secondary">Warehouses</span>
              </div>
              <span className="text-sm text-gray-500">
                {usage?.warehouses?.used || 0} / {usage?.warehouses?.limit === -1 ? '∞' : usage?.warehouses?.limit}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getUsageColor(getUsagePercentage(usage?.warehouses?.used, usage?.warehouses?.limit))} transition-all`}
                style={{ width: `${getUsagePercentage(usage?.warehouses?.used, usage?.warehouses?.limit)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Usage Warning */}
        {usage && Object.values(usage).some(u => u.limit !== -1 && (u.used / u.limit) >= 0.9) && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="text-yellow-500 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium text-yellow-700">Approaching Usage Limit</p>
              <p className="text-sm text-yellow-600">
                You're approaching your plan limits. Consider upgrading to continue growing.
              </p>
              <Link to="/pricing" className="text-sm text-primary hover:underline mt-1 inline-flex items-center gap-1">
                View Plans <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Plan Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className={`flex items-center gap-3 p-3 rounded-lg ${subscription?.features?.multiWarehouse ? 'bg-green-50' : 'bg-gray-50'}`}>
            {subscription?.features?.multiWarehouse ? (
              <Check className="text-green-500" size={20} />
            ) : (
              <span className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
            <span className={subscription?.features?.multiWarehouse ? 'text-secondary' : 'text-gray-400'}>
              Multi-warehouse Support
            </span>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-lg ${subscription?.features?.tenderManagement ? 'bg-green-50' : 'bg-gray-50'}`}>
            {subscription?.features?.tenderManagement ? (
              <Check className="text-green-500" size={20} />
            ) : (
              <span className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
            <span className={subscription?.features?.tenderManagement ? 'text-secondary' : 'text-gray-400'}>
              Tender Management
            </span>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-lg ${subscription?.features?.batchTracking ? 'bg-green-50' : 'bg-gray-50'}`}>
            {subscription?.features?.batchTracking ? (
              <Check className="text-green-500" size={20} />
            ) : (
              <span className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
            <span className={subscription?.features?.batchTracking ? 'text-secondary' : 'text-gray-400'}>
              Batch Tracking
            </span>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-lg ${subscription?.features?.advancedReports ? 'bg-green-50' : 'bg-gray-50'}`}>
            {subscription?.features?.advancedReports ? (
              <Check className="text-green-500" size={20} />
            ) : (
              <span className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
            <span className={subscription?.features?.advancedReports ? 'text-secondary' : 'text-gray-400'}>
              Advanced Reports
            </span>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-lg ${subscription?.features?.emailSupport ? 'bg-green-50' : 'bg-gray-50'}`}>
            {subscription?.features?.emailSupport ? (
              <Check className="text-green-500" size={20} />
            ) : (
              <span className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
            <span className={subscription?.features?.emailSupport ? 'text-secondary' : 'text-gray-400'}>
              Email Support
            </span>
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-lg ${subscription?.features?.apiAccess ? 'bg-green-50' : 'bg-gray-50'}`}>
            {subscription?.features?.apiAccess ? (
              <Check className="text-green-500" size={20} />
            ) : (
              <span className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
            <span className={subscription?.features?.apiAccess ? 'text-secondary' : 'text-gray-400'}>
              API Access
            </span>
          </div>
        </div>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-secondary mb-6">Payment History</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id} className="border-b border-gray-50">
                    <td className="py-4 text-sm">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-sm text-secondary">
                      {payment.description || `${payment.plan} plan - ${payment.billingCycle}`}
                    </td>
                    <td className="py-4 text-sm font-medium">
                      ₹{payment.amount?.toLocaleString()}
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                        payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-4">
                      {payment.invoiceUrl && (
                        <a
                          href={payment.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm flex items-center gap-1"
                        >
                          <Download size={14} />
                          Invoice
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
