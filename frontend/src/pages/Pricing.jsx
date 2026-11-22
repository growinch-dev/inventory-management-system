import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  X,
  Loader2,
  Zap,
  Building2,
  Crown,
  Sparkles,
} from 'lucide-react';
import { subscriptionsAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const Pricing = () => {
  const navigate = useNavigate();
  const { user, tenant } = useAuthStore();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [subscribing, setSubscribing] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await subscriptionsAPI.getPlans();
      setPlans(response.data.data);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    try {
      setSubscribing(planId);
      const response = await subscriptionsAPI.subscribe({
        plan: planId,
        billingCycle,
      });

      if (response.data.data.razorpaySubscriptionId) {
        // Initialize Razorpay checkout
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          subscription_id: response.data.data.razorpaySubscriptionId,
          name: 'Inventory System',
          description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan - ${billingCycle}`,
          handler: function (response) {
            toast.success('Subscription activated successfully!');
            navigate('/settings/billing');
          },
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          theme: {
            color: '#059669',
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        toast.success('Plan activated successfully!');
        navigate('/');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to subscribe');
    } finally {
      setSubscribing(null);
    }
  };

  const planIcons = {
    free: Sparkles,
    starter: Zap,
    pro: Building2,
    enterprise: Crown,
  };

  const planColors = {
    free: 'bg-gray-100 text-gray-600',
    starter: 'bg-blue-100 text-blue-600',
    pro: 'bg-primary/10 text-primary',
    enterprise: 'bg-purple-100 text-purple-600',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-heading font-bold text-secondary">
          Choose Your Plan
        </h1>
        <p className="text-gray-500 mt-2 max-w-2xl mx-auto">
          Select the perfect plan for your business. All plans include a 14-day free trial.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-secondary shadow-sm'
                : 'text-gray-600 hover:text-secondary'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white text-secondary shadow-sm'
                : 'text-gray-600 hover:text-secondary'
            }`}
          >
            Yearly
            <span className="ml-1 text-xs text-primary font-semibold">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const Icon = planIcons[plan.id] || Sparkles;
          const isCurrentPlan = tenant?.subscription?.plan === plan.id;
          const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
          const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(price / 12) : price;

          return (
            <div
              key={plan.id}
              className={`card p-6 relative ${
                plan.id === 'pro' ? 'ring-2 ring-primary' : ''
              }`}
            >
              {plan.id === 'pro' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Icon & Name */}
              <div className="text-center mb-6">
                <div
                  className={`w-14 h-14 rounded-xl ${planColors[plan.id]} flex items-center justify-center mx-auto mb-4`}
                >
                  <Icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-secondary">{plan.name}</h3>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                {plan.price.monthly === null ? (
                  <div className="text-2xl font-bold text-secondary">Custom</div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-secondary">
                        {price === 0 ? 'Free' : `₹${monthlyEquivalent.toLocaleString()}`}
                      </span>
                      {price > 0 && (
                        <span className="text-gray-500 text-sm">/month</span>
                      )}
                    </div>
                    {billingCycle === 'yearly' && price > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        ₹{price.toLocaleString()} billed yearly
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-primary flex-shrink-0" />
                  <span>
                    {plan.limits.maxProducts === -1
                      ? 'Unlimited products'
                      : `Up to ${plan.limits.maxProducts} products`}
                  </span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-primary flex-shrink-0" />
                  <span>
                    {plan.limits.maxUsers === -1
                      ? 'Unlimited users'
                      : `${plan.limits.maxUsers} user${plan.limits.maxUsers > 1 ? 's' : ''}`}
                  </span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-primary flex-shrink-0" />
                  <span>
                    {plan.limits.maxInvoicesPerMonth === -1
                      ? 'Unlimited invoices'
                      : `${plan.limits.maxInvoicesPerMonth} invoices/month`}
                  </span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  {plan.limits.features?.multiWarehouse ? (
                    <Check size={16} className="text-primary flex-shrink-0" />
                  ) : (
                    <X size={16} className="text-gray-300 flex-shrink-0" />
                  )}
                  <span className={!plan.limits.features?.multiWarehouse ? 'text-gray-400' : ''}>
                    Multi-warehouse
                  </span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  {plan.limits.features?.tenderManagement ? (
                    <Check size={16} className="text-primary flex-shrink-0" />
                  ) : (
                    <X size={16} className="text-gray-300 flex-shrink-0" />
                  )}
                  <span className={!plan.limits.features?.tenderManagement ? 'text-gray-400' : ''}>
                    Tender management
                  </span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  {plan.limits.features?.advancedReports ? (
                    <Check size={16} className="text-primary flex-shrink-0" />
                  ) : (
                    <X size={16} className="text-gray-300 flex-shrink-0" />
                  )}
                  <span className={!plan.limits.features?.advancedReports ? 'text-gray-400' : ''}>
                    Advanced reports
                  </span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  {plan.limits.features?.apiAccess ? (
                    <Check size={16} className="text-primary flex-shrink-0" />
                  ) : (
                    <X size={16} className="text-gray-300 flex-shrink-0" />
                  )}
                  <span className={!plan.limits.features?.apiAccess ? 'text-gray-400' : ''}>
                    API access
                  </span>
                </li>
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isCurrentPlan || subscribing === plan.id}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  isCurrentPlan
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : plan.id === 'pro'
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : plan.id === 'enterprise'
                    ? 'bg-secondary text-white hover:bg-secondary/90'
                    : 'bg-gray-100 text-secondary hover:bg-gray-200'
                }`}
              >
                {subscribing === plan.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    Processing...
                  </span>
                ) : isCurrentPlan ? (
                  'Current Plan'
                ) : plan.id === 'enterprise' ? (
                  'Contact Sales'
                ) : plan.price.monthly === 0 ? (
                  'Get Started Free'
                ) : (
                  'Start Free Trial'
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto mt-16">
        <h2 className="text-2xl font-bold text-secondary text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="font-semibold text-secondary mb-2">
              Can I change my plan later?
            </h3>
            <p className="text-gray-600 text-sm">
              Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated.
            </p>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold text-secondary mb-2">
              What happens when my trial ends?
            </h3>
            <p className="text-gray-600 text-sm">
              After your 14-day trial, you'll be automatically switched to the Free plan unless you choose to subscribe.
            </p>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold text-secondary mb-2">
              Do you offer refunds?
            </h3>
            <p className="text-gray-600 text-sm">
              Yes, we offer a 30-day money-back guarantee on all paid plans.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
