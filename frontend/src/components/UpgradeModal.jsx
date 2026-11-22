import { X, Zap, Check, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from './ui';

const UpgradeModal = ({ isOpen, onClose, limitType, currentUsage, limit, feature }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const limitMessages = {
    products: {
      title: 'Product Limit Reached',
      message: `You've reached your limit of ${limit} products. Upgrade to add more!`,
      icon: '📦',
    },
    users: {
      title: 'User Limit Reached',
      message: `You've reached your limit of ${limit} users. Upgrade to add more!`,
      icon: '👥',
    },
    invoices: {
      title: 'Monthly Invoice Limit Reached',
      message: `You've created ${currentUsage} invoices this month. Upgrade for unlimited invoices!`,
      icon: '📄',
    },
    warehouses: {
      title: 'Warehouse Limit Reached',
      message: `You've reached your limit of ${limit} warehouse${limit > 1 ? 's' : ''}. Upgrade to add more!`,
      icon: '🏢',
    },
    feature: {
      title: `${feature} is a Premium Feature`,
      message: `Upgrade to unlock ${feature} and other advanced features!`,
      icon: '⭐',
    },
  };

  const config = limitMessages[limitType] || limitMessages.feature;

  const plans = [
    {
      name: 'Starter',
      price: '₹999',
      period: '/month',
      limits: {
        products: '100 products',
        users: '3 users',
        invoices: '100 invoices/month',
        warehouses: '3 warehouses',
      },
      features: ['Multi-warehouse support', 'Batch tracking', 'Advanced reports', 'Email support'],
      popular: false,
    },
    {
      name: 'Pro',
      price: '₹2,499',
      period: '/month',
      limits: {
        products: '1,000 products',
        users: '10 users',
        invoices: 'Unlimited invoices',
        warehouses: '10 warehouses',
      },
      features: ['Everything in Starter', 'Tender management', 'API access', 'Priority support', 'Custom reports'],
      popular: true,
    },
  ];

  const handleUpgrade = () => {
    navigate('/pricing');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">{config.icon}</div>
          <h2 className="text-2xl font-heading font-bold text-secondary mb-2">
            {config.title}
          </h2>
          <p className="text-secondary-600">
            {config.message}
          </p>
          {currentUsage && limit && (
            <div className="mt-4 inline-block">
              <div className="flex items-center gap-2 px-4 py-2 bg-warning-light rounded-lg">
                <span className="text-sm font-medium text-warning-dark">
                  Current usage: {currentUsage} / {limit}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-6 rounded-xl border-2 transition-all ${
                plan.popular
                  ? 'border-primary bg-primary-50/50'
                  : 'border-secondary-200 bg-white hover:border-primary-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                    <Zap size={12} />
                    RECOMMENDED
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-heading font-bold text-secondary mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-primary">{plan.price}</span>
                  <span className="text-secondary-500">{plan.period}</span>
                </div>
              </div>

              {/* Limits */}
              <div className="mb-4 p-3 bg-secondary-50 rounded-lg">
                <div className="text-xs font-semibold text-secondary-600 mb-2">LIMITS</div>
                <div className="space-y-1 text-sm">
                  {Object.values(plan.limits).map((limit, idx) => (
                    <div key={idx} className="text-secondary-700">
                      • {limit}
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-secondary-700">
                    <Check size={16} className="text-success mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={handleUpgrade}
                variant={plan.popular ? 'primary' : 'outline'}
                className="w-full"
              >
                Upgrade to {plan.name}
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-secondary-200">
          <p className="text-sm text-secondary-500">
            Need more? Check out our{' '}
            <button
              onClick={handleUpgrade}
              className="text-primary font-semibold hover:text-primary-dark transition-colors"
            >
              Enterprise plan
            </button>
            {' '}for unlimited everything.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default UpgradeModal;
