const Tenant = require('../models/Tenant');

/**
 * Tenant Isolation Middleware
 * Extracts tenant from JWT and attaches to request
 * All subsequent queries should filter by req.tenant
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    // Skip for super_admin (can access all tenants)
    if (req.user && req.user.role === 'super_admin') {
      return next();
    }

    // Get tenant ID from JWT (set by auth middleware)
    const tenantId = req.user?.tenant;

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        error: 'No tenant associated with this user',
      });
    }

    // Fetch tenant details
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    if (!tenant.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Your organization account has been deactivated. Please contact support.',
      });
    }

    // Check subscription status
    if (!tenant.isSubscriptionActive()) {
      // Allow read-only access for expired subscriptions
      const readOnlyMethods = ['GET', 'HEAD', 'OPTIONS'];
      if (!readOnlyMethods.includes(req.method)) {
        return res.status(402).json({
          success: false,
          error: 'Your subscription has expired. Please renew to continue.',
          code: 'SUBSCRIPTION_EXPIRED',
          subscription: {
            plan: tenant.subscription.plan,
            status: tenant.subscription.status,
            trialEndsAt: tenant.subscription.trialEndsAt,
          },
        });
      }
    }

    // Attach tenant to request
    req.tenant = tenant;
    req.tenantId = tenantId;

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error verifying tenant',
    });
  }
};

/**
 * Subscription/Plan Limit Middleware
 * Checks if tenant can perform action based on plan limits
 */
const checkPlanLimit = (resourceType) => {
  return async (req, res, next) => {
    try {
      // Skip for super_admin
      if (req.user?.role === 'super_admin') {
        return next();
      }

      const tenant = req.tenant;

      if (!tenant) {
        return res.status(403).json({
          success: false,
          error: 'Tenant not found',
        });
      }

      // Only check on create operations
      if (req.method !== 'POST') {
        return next();
      }

      // Check if tenant can add more of this resource
      if (!tenant.canAdd(resourceType)) {
        const limitMap = {
          product: { limit: 'maxProducts', name: 'products' },
          user: { limit: 'maxUsers', name: 'users' },
          invoice: { limit: 'maxInvoicesPerMonth', name: 'invoices this month' },
          warehouse: { limit: 'maxWarehouses', name: 'warehouses' },
          supplier: { limit: 'maxSuppliers', name: 'suppliers' },
          customer: { limit: 'maxCustomers', name: 'customers' },
        };

        const mapping = limitMap[resourceType];
        const limit = tenant.limits[mapping.limit];

        return res.status(403).json({
          success: false,
          error: `You've reached the maximum limit of ${limit} ${mapping.name} for your plan.`,
          code: 'PLAN_LIMIT_REACHED',
          upgrade: true,
          currentPlan: tenant.subscription.plan,
          limit: limit,
          resourceType: resourceType,
        });
      }

      next();
    } catch (error) {
      console.error('Plan limit check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error checking plan limits',
      });
    }
  };
};

/**
 * Feature Access Middleware
 * Checks if tenant has access to a specific feature
 */
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      // Skip for super_admin
      if (req.user?.role === 'super_admin') {
        return next();
      }

      const tenant = req.tenant;

      if (!tenant) {
        return res.status(403).json({
          success: false,
          error: 'Tenant not found',
        });
      }

      if (!tenant.hasFeature(featureName)) {
        return res.status(403).json({
          success: false,
          error: `The ${featureName.replace(/([A-Z])/g, ' $1').toLowerCase()} feature is not available on your current plan.`,
          code: 'FEATURE_NOT_AVAILABLE',
          upgrade: true,
          currentPlan: tenant.subscription.plan,
          requiredFeature: featureName,
        });
      }

      next();
    } catch (error) {
      console.error('Feature check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error checking feature access',
      });
    }
  };
};

/**
 * Update usage after successful create
 * Call this after successfully creating a resource
 */
const incrementUsage = (resourceType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method
    res.json = async function(data) {
      // Only increment on successful creates
      if (res.statusCode >= 200 && res.statusCode < 300 && req.method === 'POST' && req.tenant) {
        try {
          await req.tenant.incrementUsage(resourceType);
        } catch (error) {
          console.error('Error incrementing usage:', error);
        }
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Decrement usage after successful delete
 */
const decrementUsage = (resourceType) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = async function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.method === 'DELETE' && req.tenant) {
        try {
          await req.tenant.decrementUsage(resourceType);
        } catch (error) {
          console.error('Error decrementing usage:', error);
        }
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Add tenant filter to queries
 * Helper to ensure all queries are scoped to tenant
 */
const addTenantFilter = (query, tenantId) => {
  if (!tenantId) return query;
  return { ...query, tenant: tenantId };
};

/**
 * Super Admin only middleware
 */
const superAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Super admin only.',
    });
  }
  next();
};

module.exports = {
  tenantMiddleware,
  checkPlanLimit,
  requireFeature,
  incrementUsage,
  decrementUsage,
  addTenantFilter,
  superAdminOnly,
};
