const Razorpay = require('razorpay');
const crypto = require('crypto');
const Tenant = require('../models/Tenant');
const { Subscription, SubscriptionPayment, Coupon, SUBSCRIPTION_PLANS } = require('../models/Subscription');

// Initialize Razorpay (only if credentials are available)
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn('⚠️  Razorpay credentials not configured. Payment features will be disabled.');
}

/**
 * Create a Razorpay customer
 */
const createCustomer = async (tenant) => {
  if (!razorpay) {
    throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.');
  }

  try {
    const customer = await razorpay.customers.create({
      name: tenant.name,
      email: tenant.email,
      contact: tenant.phone || '',
      notes: {
        tenantId: tenant._id.toString(),
      },
    });

    // Update tenant with Razorpay customer ID
    tenant.billing.razorpayCustomerId = customer.id;
    await tenant.save();

    return customer;
  } catch (error) {
    console.error('Error creating Razorpay customer:', error);
    throw error;
  }
};

/**
 * Create a subscription
 */
const createSubscription = async (tenantId, planId, billingCycle, couponCode = null) => {
  try {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) throw new Error('Invalid plan');

    // Get or create Razorpay customer
    let customerId = tenant.billing.razorpayCustomerId;
    if (!customerId) {
      const customer = await createCustomer(tenant);
      customerId = customer.id;
    }

    // Calculate amount
    let amount = plan.price[billingCycle];
    let discount = 0;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (coupon) {
        const validation = coupon.isValid(planId, billingCycle, amount, tenantId);
        if (validation.valid) {
          discount = coupon.calculateDiscount(amount);
          amount -= discount;
        }
      }
    }

    // For free plan, just update tenant
    if (planId === 'free' || amount === 0) {
      tenant.updateLimitsForPlan('free');
      tenant.subscription.status = 'active';
      tenant.subscription.plan = 'free';
      await tenant.save();

      return {
        success: true,
        message: 'Free plan activated',
        subscription: tenant.subscription,
      };
    }

    // Get Razorpay plan ID
    const razorpayPlanId = plan.razorpayPlanId[billingCycle];
    if (!razorpayPlanId) {
      throw new Error('Razorpay plan not configured for this billing cycle');
    }

    // Create Razorpay subscription
    if (!razorpay) {
      throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.');
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      customer_id: customerId,
      quantity: 1,
      total_count: billingCycle === 'yearly' ? 12 : 12, // 12 billing cycles
      customer_notify: 1,
      notes: {
        tenantId: tenant._id.toString(),
        plan: planId,
        billingCycle,
      },
    });

    // Save subscription record
    const subscriptionRecord = await Subscription.create({
      tenant: tenant._id,
      plan: planId,
      billingCycle,
      status: 'active',
      amount: plan.price[billingCycle],
      razorpay: {
        subscriptionId: subscription.id,
        customerId,
        planId: razorpayPlanId,
        shortUrl: subscription.short_url,
      },
      discount: couponCode ? {
        code: couponCode,
        amount: discount,
      } : undefined,
      changeType: tenant.subscription.plan === 'free' ? 'new' : 'upgrade',
      previousPlan: tenant.subscription.plan,
    });

    // Update tenant
    tenant.billing.razorpaySubscriptionId = subscription.id;
    tenant.subscription.status = 'active';
    await tenant.save();

    // Update coupon usage
    if (couponCode) {
      await Coupon.updateOne(
        { code: couponCode.toUpperCase() },
        {
          $inc: { usedCount: 1 },
          $push: { usedBy: { tenant: tenant._id } },
        }
      );
    }

    return {
      success: true,
      subscription: subscriptionRecord,
      razorpaySubscription: subscription,
      paymentLink: subscription.short_url,
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
};

/**
 * Cancel a subscription
 */
const cancelSubscription = async (tenantId, reason = '') => {
  try {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const subscriptionId = tenant.billing.razorpaySubscriptionId;
    if (!subscriptionId) {
      // Just downgrade to free
      tenant.updateLimitsForPlan('free');
      tenant.subscription.status = 'cancelled';
      tenant.subscription.cancelAtPeriodEnd = false;
      await tenant.save();

      return { success: true, message: 'Subscription cancelled' };
    }

    // Cancel Razorpay subscription at period end
    if (razorpay) {
      await razorpay.subscriptions.cancel(subscriptionId, true); // cancel_at_cycle_end = true
    }

    // Update subscription record
    await Subscription.updateOne(
      { 'razorpay.subscriptionId': subscriptionId },
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason,
      }
    );

    // Update tenant
    tenant.subscription.cancelAtPeriodEnd = true;
    await tenant.save();

    return {
      success: true,
      message: 'Subscription will be cancelled at the end of the current billing period',
    };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

/**
 * Change subscription plan
 */
const changePlan = async (tenantId, newPlanId, billingCycle) => {
  try {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const currentPlan = tenant.subscription.plan;
    const newPlan = SUBSCRIPTION_PLANS[newPlanId];
    if (!newPlan) throw new Error('Invalid plan');

    // Determine if upgrade or downgrade
    const planOrder = ['free', 'starter', 'pro', 'enterprise'];
    const isUpgrade = planOrder.indexOf(newPlanId) > planOrder.indexOf(currentPlan);

    // For downgrades, schedule for end of period
    if (!isUpgrade) {
      // Check if current usage exceeds new plan limits
      const canDowngrade = canTenantDowngrade(tenant, newPlanId);
      if (!canDowngrade.allowed) {
        return {
          success: false,
          error: canDowngrade.reason,
          currentUsage: canDowngrade.usage,
        };
      }
    }

    // Cancel current subscription and create new one
    if (tenant.billing.razorpaySubscriptionId && razorpay) {
      await razorpay.subscriptions.cancel(tenant.billing.razorpaySubscriptionId, !isUpgrade);
    }

    // Create new subscription
    const result = await createSubscription(tenantId, newPlanId, billingCycle);

    // Update plan limits
    tenant.updateLimitsForPlan(newPlanId);
    await tenant.save();

    return {
      success: true,
      message: isUpgrade ? 'Plan upgraded successfully' : 'Plan will be changed at end of billing period',
      ...result,
    };
  } catch (error) {
    console.error('Error changing plan:', error);
    throw error;
  }
};

/**
 * Check if tenant can downgrade based on current usage
 */
const canTenantDowngrade = (tenant, newPlanId) => {
  const newPlan = SUBSCRIPTION_PLANS[newPlanId];
  const usage = tenant.usage;

  const checks = [
    { field: 'productsCount', limit: newPlan.limits.maxProducts, name: 'products' },
    { field: 'usersCount', limit: newPlan.limits.maxUsers, name: 'users' },
    { field: 'warehousesCount', limit: newPlan.limits.maxWarehouses, name: 'warehouses' },
    { field: 'suppliersCount', limit: newPlan.limits.maxSuppliers, name: 'suppliers' },
    { field: 'customersCount', limit: newPlan.limits.maxCustomers, name: 'customers' },
  ];

  for (const check of checks) {
    if (check.limit !== -1 && usage[check.field] > check.limit) {
      return {
        allowed: false,
        reason: `You have ${usage[check.field]} ${check.name}, but the ${newPlanId} plan allows only ${check.limit}. Please reduce your ${check.name} before downgrading.`,
        usage: { [check.name]: usage[check.field], limit: check.limit },
      };
    }
  }

  return { allowed: true };
};

/**
 * Handle Razorpay webhook events
 */
const handleWebhook = async (event, payload) => {
  try {
    switch (event) {
      case 'subscription.activated':
        await handleSubscriptionActivated(payload);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(payload);
        break;

      case 'subscription.pending':
        await handleSubscriptionPending(payload);
        break;

      case 'subscription.halted':
        await handleSubscriptionHalted(payload);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(payload);
        break;

      case 'payment.captured':
        await handlePaymentCaptured(payload);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Webhook handling error:', error);
    throw error;
  }
};

/**
 * Webhook handlers
 */
const handleSubscriptionActivated = async (payload) => {
  const subscriptionId = payload.subscription.entity.id;
  const tenantId = payload.subscription.entity.notes?.tenantId;

  if (tenantId) {
    const tenant = await Tenant.findById(tenantId);
    if (tenant) {
      tenant.subscription.status = 'active';
      tenant.subscription.currentPeriodStart = new Date(payload.subscription.entity.current_start * 1000);
      tenant.subscription.currentPeriodEnd = new Date(payload.subscription.entity.current_end * 1000);
      await tenant.save();
    }
  }
};

const handleSubscriptionCharged = async (payload) => {
  const subscriptionId = payload.subscription.entity.id;
  const tenantId = payload.subscription.entity.notes?.tenantId;
  const payment = payload.payment.entity;

  if (tenantId) {
    // Record payment
    await SubscriptionPayment.create({
      tenant: tenantId,
      subscription: await Subscription.findOne({ 'razorpay.subscriptionId': subscriptionId }).select('_id'),
      type: 'subscription',
      amount: payment.amount / 100,
      status: 'completed',
      razorpay: {
        paymentId: payment.id,
        method: payment.method,
      },
      paidAt: new Date(),
    });

    // Update tenant
    const tenant = await Tenant.findById(tenantId);
    if (tenant) {
      tenant.subscription.currentPeriodStart = new Date(payload.subscription.entity.current_start * 1000);
      tenant.subscription.currentPeriodEnd = new Date(payload.subscription.entity.current_end * 1000);
      await tenant.save();
    }
  }
};

const handleSubscriptionPending = async (payload) => {
  const tenantId = payload.subscription.entity.notes?.tenantId;

  if (tenantId) {
    const tenant = await Tenant.findById(tenantId);
    if (tenant) {
      tenant.subscription.status = 'past_due';
      await tenant.save();
    }
  }
};

const handleSubscriptionHalted = async (payload) => {
  const tenantId = payload.subscription.entity.notes?.tenantId;

  if (tenantId) {
    const tenant = await Tenant.findById(tenantId);
    if (tenant) {
      tenant.subscription.status = 'inactive';
      // Downgrade to free plan limits
      tenant.updateLimitsForPlan('free');
      await tenant.save();
    }
  }
};

const handleSubscriptionCancelled = async (payload) => {
  const tenantId = payload.subscription.entity.notes?.tenantId;

  if (tenantId) {
    const tenant = await Tenant.findById(tenantId);
    if (tenant) {
      tenant.subscription.status = 'cancelled';
      tenant.updateLimitsForPlan('free');
      await tenant.save();
    }
  }
};

const handlePaymentCaptured = async (payload) => {
  const payment = payload.payment.entity;
  const notes = payment.notes || {};

  if (notes.tenantId) {
    await SubscriptionPayment.updateOne(
      { 'razorpay.paymentId': payment.id },
      {
        status: 'completed',
        paidAt: new Date(),
      }
    );
  }
};

const handlePaymentFailed = async (payload) => {
  const payment = payload.payment.entity;
  const notes = payment.notes || {};

  if (notes.tenantId) {
    await SubscriptionPayment.updateOne(
      { 'razorpay.paymentId': payment.id },
      {
        status: 'failed',
        metadata: { errorCode: payment.error_code, errorDescription: payment.error_description },
      }
    );
  }
};

/**
 * Verify Razorpay webhook signature
 */
const verifyWebhookSignature = (body, signature) => {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return signature === expectedSignature;
};

/**
 * Get subscription invoice
 */
const getInvoices = async (tenantId) => {
  const payments = await SubscriptionPayment.find({
    tenant: tenantId,
    status: 'completed',
  })
    .sort({ createdAt: -1 })
    .limit(24);

  return payments;
};

/**
 * Get plan details
 */
const getPlans = () => {
  return Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: plan.price,
    features: plan.features,
    limits: plan.limits,
    popular: plan.id === 'pro',
  }));
};

/**
 * Validate coupon
 */
const validateCoupon = async (code, planId, billingCycle, amount, tenantId) => {
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  if (!coupon) {
    return { valid: false, error: 'Invalid coupon code' };
  }

  const validation = coupon.isValid(planId, billingCycle, amount, tenantId);

  if (!validation.valid) {
    return validation;
  }

  const discount = coupon.calculateDiscount(amount);

  return {
    valid: true,
    discount,
    finalAmount: amount - discount,
    coupon: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
  };
};

module.exports = {
  createCustomer,
  createSubscription,
  cancelSubscription,
  changePlan,
  handleWebhook,
  verifyWebhookSignature,
  getInvoices,
  getPlans,
  validateCoupon,
  SUBSCRIPTION_PLANS,
};
