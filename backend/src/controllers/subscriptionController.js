const Tenant = require('../models/Tenant');
const { Subscription, SubscriptionPayment, SUBSCRIPTION_PLANS } = require('../models/Subscription');
const billingService = require('../services/billingService');

/**
 * @desc    Get available subscription plans
 * @route   GET /api/subscriptions/plans
 * @access  Public
 */
exports.getPlans = async (req, res) => {
  try {
    const plans = billingService.getPlans();

    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching subscription plans',
    });
  }
};

/**
 * @desc    Get current subscription details
 * @route   GET /api/subscriptions/current
 * @access  Private
 */
exports.getCurrentSubscription = async (req, res) => {
  try {
    const tenant = req.tenant;

    // Get active subscription
    const subscription = await Subscription.findOne({
      tenant: tenant._id,
      status: { $in: ['active', 'trialing'] },
    }).sort({ createdAt: -1 });

    const plan = SUBSCRIPTION_PLANS[tenant.subscription.plan];

    res.status(200).json({
      success: true,
      data: {
        plan: {
          id: tenant.subscription.plan,
          name: plan?.name || 'Free',
          price: plan?.price || { monthly: 0, yearly: 0 },
        },
        status: tenant.subscription.status,
        trialEndsAt: tenant.subscription.trialEndsAt,
        currentPeriodStart: tenant.subscription.currentPeriodStart,
        currentPeriodEnd: tenant.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: tenant.subscription.cancelAtPeriodEnd,
        limits: tenant.limits,
        usage: tenant.usage,
        subscription,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching subscription details',
    });
  }
};

/**
 * @desc    Subscribe to a plan
 * @route   POST /api/subscriptions/subscribe
 * @access  Private
 */
exports.subscribe = async (req, res) => {
  try {
    const { planId, billingCycle = 'monthly', couponCode } = req.body;
    const tenantId = req.tenantId;

    // Validate plan
    if (!SUBSCRIPTION_PLANS[planId]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan selected',
      });
    }

    // Create subscription
    const result = await billingService.createSubscription(
      tenantId,
      planId,
      billingCycle,
      couponCode
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error creating subscription',
    });
  }
};

/**
 * @desc    Change subscription plan
 * @route   PUT /api/subscriptions/change-plan
 * @access  Private
 */
exports.changePlan = async (req, res) => {
  try {
    const { planId, billingCycle = 'monthly' } = req.body;
    const tenantId = req.tenantId;

    const result = await billingService.changePlan(tenantId, planId, billingCycle);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error changing plan:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error changing subscription plan',
    });
  }
};

/**
 * @desc    Cancel subscription
 * @route   POST /api/subscriptions/cancel
 * @access  Private
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const { reason } = req.body;
    const tenantId = req.tenantId;

    const result = await billingService.cancelSubscription(tenantId, reason);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error cancelling subscription',
    });
  }
};

/**
 * @desc    Get payment history
 * @route   GET /api/subscriptions/invoices
 * @access  Private
 */
exports.getInvoices = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const invoices = await billingService.getInvoices(tenantId);

    res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching payment history',
    });
  }
};

/**
 * @desc    Validate coupon code
 * @route   POST /api/subscriptions/validate-coupon
 * @access  Private
 */
exports.validateCoupon = async (req, res) => {
  try {
    const { code, planId, billingCycle } = req.body;
    const tenantId = req.tenantId;

    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan',
      });
    }

    const amount = plan.price[billingCycle] || plan.price.monthly;
    const result = await billingService.validateCoupon(code, planId, billingCycle, amount, tenantId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({
      success: false,
      error: 'Error validating coupon',
    });
  }
};

/**
 * @desc    Get usage statistics
 * @route   GET /api/subscriptions/usage
 * @access  Private
 */
exports.getUsage = async (req, res) => {
  try {
    const tenant = req.tenant;

    const usage = Object.entries(tenant.usage.toObject()).map(([key, value]) => {
      const limitKey = key.replace('Count', '').replace('ThisMonth', 'PerMonth');
      const limitMap = {
        products: 'maxProducts',
        users: 'maxUsers',
        invoices: 'maxInvoicesPerMonth',
        warehouses: 'maxWarehouses',
        suppliers: 'maxSuppliers',
        customers: 'maxCustomers',
      };

      const limitField = limitMap[limitKey] || limitKey;
      const limit = tenant.limits[limitField];

      return {
        resource: key,
        current: value,
        limit: limit === -1 ? 'Unlimited' : limit,
        percentage: limit === -1 ? 0 : Math.round((value / limit) * 100),
        isNearLimit: limit !== -1 && value >= limit * 0.8,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        usage,
        features: tenant.limits.features,
      },
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching usage statistics',
    });
  }
};

/**
 * @desc    Handle Razorpay webhook
 * @route   POST /api/subscriptions/webhook
 * @access  Public (verified by signature)
 */
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];

    // Verify signature
    if (!billingService.verifyWebhookSignature(JSON.stringify(req.body), signature)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid signature',
      });
    }

    const { event, payload } = req.body;

    await billingService.handleWebhook(event, payload);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
    });
  }
};
