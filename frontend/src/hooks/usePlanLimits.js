import { useState, useCallback } from 'react';
import useAuthStore from '../store/authStore';

const usePlanLimits = () => {
  const { tenant } = useAuthStore();
  const [upgradeModal, setUpgradeModal] = useState({
    isOpen: false,
    limitType: null,
    currentUsage: null,
    limit: null,
    feature: null,
  });

  // Get current plan limits
  const limits = tenant?.limits || {
    maxProducts: 10,
    maxUsers: 1,
    maxInvoicesPerMonth: 50,
    maxWarehouses: 1,
    maxSuppliers: 50,
    maxCustomers: 50,
  };

  // Get current usage
  const usage = tenant?.usage || {
    productsCount: 0,
    usersCount: 1,
    invoicesThisMonth: 0,
    warehousesCount: 0,
    suppliersCount: 0,
    customersCount: 0,
  };

  // Get feature flags
  const features = tenant?.features || {
    multiWarehouse: false,
    tenderManagement: false,
    batchTracking: false,
    advancedReports: false,
    apiAccess: false,
  };

  // Check if a limit has been reached
  const checkLimit = useCallback((type) => {
    const checks = {
      products: {
        current: usage.productsCount,
        limit: limits.maxProducts,
        reached: limits.maxProducts !== -1 && usage.productsCount >= limits.maxProducts,
      },
      users: {
        current: usage.usersCount,
        limit: limits.maxUsers,
        reached: limits.maxUsers !== -1 && usage.usersCount >= limits.maxUsers,
      },
      invoices: {
        current: usage.invoicesThisMonth,
        limit: limits.maxInvoicesPerMonth,
        reached: limits.maxInvoicesPerMonth !== -1 && usage.invoicesThisMonth >= limits.maxInvoicesPerMonth,
      },
      warehouses: {
        current: usage.warehousesCount,
        limit: limits.maxWarehouses,
        reached: limits.maxWarehouses !== -1 && usage.warehousesCount >= limits.maxWarehouses,
      },
      suppliers: {
        current: usage.suppliersCount,
        limit: limits.maxSuppliers,
        reached: limits.maxSuppliers !== -1 && usage.suppliersCount >= limits.maxSuppliers,
      },
      customers: {
        current: usage.customersCount,
        limit: limits.maxCustomers,
        reached: limits.maxCustomers !== -1 && usage.customersCount >= limits.maxCustomers,
      },
    };

    return checks[type] || { current: 0, limit: -1, reached: false };
  }, [usage, limits]);

  // Check if a feature is available
  const checkFeature = useCallback((featureName) => {
    return features[featureName] === true;
  }, [features]);

  // Show upgrade modal for limit
  const showUpgradeModal = useCallback((limitType, customMessage) => {
    const limitCheck = checkLimit(limitType);
    setUpgradeModal({
      isOpen: true,
      limitType,
      currentUsage: limitCheck.current,
      limit: limitCheck.limit,
      feature: null,
    });
  }, [checkLimit]);

  // Show upgrade modal for feature
  const showFeatureModal = useCallback((featureName) => {
    setUpgradeModal({
      isOpen: true,
      limitType: 'feature',
      currentUsage: null,
      limit: null,
      feature: featureName,
    });
  }, []);

  // Close upgrade modal
  const closeUpgradeModal = useCallback(() => {
    setUpgradeModal({
      isOpen: false,
      limitType: null,
      currentUsage: null,
      limit: null,
      feature: null,
    });
  }, []);

  // Check and enforce limit (returns true if action allowed)
  const enforceLimit = useCallback((type) => {
    const limitCheck = checkLimit(type);
    if (limitCheck.reached) {
      showUpgradeModal(type);
      return false;
    }
    return true;
  }, [checkLimit, showUpgradeModal]);

  // Check and enforce feature (returns true if feature available)
  const enforceFeature = useCallback((featureName) => {
    const hasFeature = checkFeature(featureName);
    if (!hasFeature) {
      showFeatureModal(featureName);
      return false;
    }
    return true;
  }, [checkFeature, showFeatureModal]);

  return {
    limits,
    usage,
    features,
    checkLimit,
    checkFeature,
    enforceLimit,
    enforceFeature,
    upgradeModal,
    showUpgradeModal,
    showFeatureModal,
    closeUpgradeModal,
  };
};

export default usePlanLimits;
