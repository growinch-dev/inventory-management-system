const Tenant = require('../models/Tenant');

/**
 * Check if tenant can create more resources of a given type
 * Returns 403 if limit reached
 */
exports.checkLimit = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.tenant) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const tenant = await Tenant.findById(req.user.tenant);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Organization not found',
        });
      }

      // Check if subscription is active
      if (tenant.subscription.status === 'inactive' || tenant.subscription.status === 'cancelled') {
        return res.status(403).json({
          success: false,
          message: 'Your subscription is inactive. Please renew to continue.',
          limitType: 'subscription_inactive',
        });
      }

      // Map resource types to limit fields
      const limitMapping = {
        product: { limit: 'maxProducts', usage: 'productsCount' },
        user: { limit: 'maxUsers', usage: 'usersCount' },
        invoice: { limit: 'maxInvoicesPerMonth', usage: 'invoicesThisMonth' },
        warehouse: { limit: 'maxWarehouses', usage: 'warehousesCount' },
        supplier: { limit: 'maxSuppliers', usage: 'suppliersCount' },
        customer: { limit: 'maxCustomers', usage: 'customersCount' },
      };

      const mapping = limitMapping[resourceType];
      if (!mapping) {
        // If no mapping, allow the request
        return next();
      }

      const limit = tenant.limits[mapping.limit];
      const usage = tenant.usage[mapping.usage];

      // -1 means unlimited
      if (limit === -1) {
        return next();
      }

      // Check if limit reached
      if (usage >= limit) {
        return res.status(403).json({
          success: false,
          message: `You have reached your ${resourceType} limit (${limit}). Please upgrade your plan to add more.`,
          limitType: resourceType,
          currentUsage: usage,
          limit: limit,
          plan: tenant.subscription.plan,
        });
      }

      // Limit not reached, continue
      next();
    } catch (error) {
      console.error('Limit enforcement error:', error);
      next(error);
    }
  };
};

/**
 * Check if tenant has access to a feature
 * Returns 403 if feature not available
 */
exports.checkFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.tenant) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const tenant = await Tenant.findById(req.user.tenant);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Organization not found',
        });
      }

      // Map feature names to tenant.features fields
      const featureMapping = {
        multiWarehouse: 'multiWarehouse',
        tenderManagement: 'tenderManagement',
        batchTracking: 'batchTracking',
        advancedReports: 'advancedReports',
        apiAccess: 'apiAccess',
      };

      const featureKey = featureMapping[featureName];
      if (!featureKey) {
        // If no mapping, allow the request
        return next();
      }

      const hasFeature = tenant.limits?.features?.[featureKey] === true;

      if (!hasFeature) {
        return res.status(403).json({
          success: false,
          message: `${featureName} is not available in your current plan. Please upgrade to access this feature.`,
          featureName: featureName,
          plan: tenant.subscription.plan,
          requiresUpgrade: true,
        });
      }

      // Feature available, continue
      next();
    } catch (error) {
      console.error('Feature check error:', error);
      next(error);
    }
  };
};

/**
 * Check subscription status
 * Block access if subscription is past_due or inactive
 */
exports.requireActiveSubscription = async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const tenant = await Tenant.findById(req.user.tenant);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    // Allow free plan
    if (tenant.subscription.plan === 'free') {
      return next();
    }

    // Check subscription status
    const allowedStatuses = ['active', 'trialing'];
    if (!allowedStatuses.includes(tenant.subscription.status)) {
      return res.status(403).json({
        success: false,
        message: 'Your subscription is not active. Please update your payment method or contact support.',
        subscriptionStatus: tenant.subscription.status,
      });
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    next(error);
  }
};
