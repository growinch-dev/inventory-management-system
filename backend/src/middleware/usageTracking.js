const Tenant = require('../models/Tenant');

/**
 * Track resource creation in tenant usage
 * Call this middleware AFTER successful creation
 */
exports.trackUsage = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.tenant) {
        return next();
      }

      const tenant = await Tenant.findById(req.user.tenant);
      if (!tenant) {
        return next();
      }

      await tenant.incrementUsage(resourceType);
      next();
    } catch (error) {
      // Don't fail the request if usage tracking fails
      console.error('Usage tracking error:', error);
      next();
    }
  };
};

/**
 * Track resource deletion in tenant usage
 * Call this middleware AFTER successful deletion
 */
exports.trackUsageDecrease = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.tenant) {
        return next();
      }

      const tenant = await Tenant.findById(req.user.tenant);
      if (!tenant) {
        return next();
      }

      await tenant.decrementUsage(resourceType);
      next();
    } catch (error) {
      // Don't fail the request if usage tracking fails
      console.error('Usage tracking decrease error:', error);
      next();
    }
  };
};

/**
 * Middleware wrapper to track usage after a successful response
 * Usage: wrapWithUsageTracking(controller, 'product', 'create')
 */
exports.wrapWithUsageTracking = (controller, resourceType, action = 'create') => {
  return async (req, res, next) => {
    // Store the original res.json
    const originalJson = res.json.bind(res);

    // Override res.json to track usage after successful response
    res.json = async function(data) {
      // Only track if response was successful
      if (data && data.success && req.user && req.user.tenant) {
        try {
          const tenant = await Tenant.findById(req.user.tenant);
          if (tenant) {
            if (action === 'create') {
              await tenant.incrementUsage(resourceType);
            } else if (action === 'delete') {
              await tenant.decrementUsage(resourceType);
            }
          }
        } catch (error) {
          console.error('Usage tracking error:', error);
        }
      }

      // Call original json method
      return originalJson(data);
    };

    // Call the controller
    return controller(req, res, next);
  };
};

/**
 * Reset monthly invoice counter
 * Call this via cron job at the start of each month
 */
exports.resetMonthlyInvoices = async () => {
  try {
    const result = await Tenant.updateMany(
      {},
      { 'usage.invoicesThisMonth': 0 }
    );
    console.log(`Reset monthly invoices for ${result.modifiedCount} tenants`);
    return result;
  } catch (error) {
    console.error('Error resetting monthly invoices:', error);
    throw error;
  }
};
