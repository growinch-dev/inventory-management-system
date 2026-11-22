import { useState } from 'react';
import { PageHeader, Card, Button } from '../components/ui';
import UpgradeModal from '../components/UpgradeModal';
import { Package, Users, FileText, Building2, Star } from 'lucide-react';

const LimitDemo = () => {
  const [modalConfig, setModalConfig] = useState({
    isOpen: true, // Open by default to show demo
    limitType: 'products',
    currentUsage: 10,
    limit: 10,
    feature: null,
  });

  const showLimitModal = (type, current, max) => {
    setModalConfig({
      isOpen: true,
      limitType: type,
      currentUsage: current,
      limit: max,
      feature: null,
    });
  };

  const showFeatureModal = (featureName) => {
    setModalConfig({
      isOpen: true,
      limitType: 'feature',
      currentUsage: null,
      limit: null,
      feature: featureName,
    });
  };

  const closeModal = () => {
    setModalConfig({
      ...modalConfig,
      isOpen: false,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Limit Enforcement Demo"
        subtitle="Click the buttons below to see different upgrade modals"
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Products Limit */}
        <Card padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Package size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary">Products Limit</h3>
              <p className="text-sm text-secondary-500">10 / 10 used</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => showLimitModal('products', 10, 10)}
          >
            Try Adding Product
          </Button>
        </Card>

        {/* Users Limit */}
        <Card padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <Users size={24} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary">Users Limit</h3>
              <p className="text-sm text-secondary-500">1 / 1 used</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => showLimitModal('users', 1, 1)}
          >
            Try Adding User
          </Button>
        </Card>

        {/* Invoices Limit */}
        <Card padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <FileText size={24} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary">Monthly Invoices</h3>
              <p className="text-sm text-secondary-500">50 / 50 used</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => showLimitModal('invoices', 50, 50)}
          >
            Try Creating Invoice
          </Button>
        </Card>

        {/* Warehouses Limit */}
        <Card padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-50 rounded-xl">
              <Building2 size={24} className="text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary">Warehouses</h3>
              <p className="text-sm text-secondary-500">1 / 1 used</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => showLimitModal('warehouses', 1, 1)}
          >
            Try Adding Warehouse
          </Button>
        </Card>

        {/* Feature: Batch Tracking */}
        <Card padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-pink-50 rounded-xl">
              <Star size={24} className="text-pink-600" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary">Batch Tracking</h3>
              <p className="text-sm text-secondary-500">Premium Feature</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => showFeatureModal('Batch Tracking')}
          >
            Try Using Feature
          </Button>
        </Card>

        {/* Feature: Advanced Reports */}
        <Card padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-50 rounded-xl">
              <Star size={24} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary">Advanced Reports</h3>
              <p className="text-sm text-secondary-500">Premium Feature</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => showFeatureModal('Advanced Reports')}
          >
            Try Using Feature
          </Button>
        </Card>
      </div>

      <Card padding="lg" className="bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-secondary mb-2">How to Test</h3>
        <ul className="text-sm text-secondary-600 space-y-1">
          <li>• Click any button above to see the upgrade modal</li>
          <li>• The modal shows different content based on the limit type</li>
          <li>• Compare Starter vs Pro plans side-by-side</li>
          <li>• Click "Upgrade to Starter/Pro" to navigate to pricing page</li>
          <li>• The modal is integrated in Products page (try adding a product when at limit)</li>
        </ul>
      </Card>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        limitType={modalConfig.limitType}
        currentUsage={modalConfig.currentUsage}
        limit={modalConfig.limit}
        feature={modalConfig.feature}
      />
    </div>
  );
};

export default LimitDemo;
