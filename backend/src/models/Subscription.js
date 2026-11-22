const mongoose = require('mongoose');

// Subscription Plans Configuration
const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    price: {
      monthly: 0,
      yearly: 0,
    },
    razorpayPlanId: {
      monthly: null,
      yearly: null,
    },
    features: [
      '50 Products',
      '1 User',
      '20 Invoices/month',
      '1 Warehouse',
      'Basic Reports',
      'Email Support',
    ],
    limits: {
      maxProducts: 50,
      maxUsers: 1,
      maxInvoicesPerMonth: 20,
      maxWarehouses: 1,
      maxSuppliers: 10,
      maxCustomers: 20,
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For growing businesses',
    price: {
      monthly: 999,
      yearly: 9990, // 2 months free
    },
    razorpayPlanId: {
      monthly: process.env.RAZORPAY_PLAN_STARTER_MONTHLY,
      yearly: process.env.RAZORPAY_PLAN_STARTER_YEARLY,
    },
    features: [
      '500 Products',
      '3 Users',
      '100 Invoices/month',
      '2 Warehouses',
      'Batch Tracking',
      'Email Notifications',
      'Standard Reports',
      'Priority Support',
    ],
    limits: {
      maxProducts: 500,
      maxUsers: 3,
      maxInvoicesPerMonth: 100,
      maxWarehouses: 2,
      maxSuppliers: 50,
      maxCustomers: 100,
    },
  },
  pro: {
    id: 'pro',
    name: 'Professional',
    description: 'For established businesses',
    price: {
      monthly: 2499,
      yearly: 24990, // 2 months free
    },
    razorpayPlanId: {
      monthly: process.env.RAZORPAY_PLAN_PRO_MONTHLY,
      yearly: process.env.RAZORPAY_PLAN_PRO_YEARLY,
    },
    features: [
      '5,000 Products',
      '10 Users',
      'Unlimited Invoices',
      '5 Warehouses',
      'Tender Management',
      'Demo Issue Tracking',
      'Advanced Reports',
      'API Access',
      'Dedicated Support',
    ],
    limits: {
      maxProducts: 5000,
      maxUsers: 10,
      maxInvoicesPerMonth: -1,
      maxWarehouses: 5,
      maxSuppliers: -1,
      maxCustomers: -1,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: {
      monthly: null, // Custom pricing
      yearly: null,
    },
    razorpayPlanId: {
      monthly: null,
      yearly: null,
    },
    features: [
      'Unlimited Products',
      'Unlimited Users',
      'Unlimited Everything',
      'White Labeling',
      'Custom Integrations',
      'Dedicated Account Manager',
      'SLA Guarantee',
      'On-premise Option',
    ],
    limits: {
      maxProducts: -1,
      maxUsers: -1,
      maxInvoicesPerMonth: -1,
      maxWarehouses: -1,
      maxSuppliers: -1,
      maxCustomers: -1,
    },
  },
};

// Payment/Transaction History
const subscriptionSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },

  // Plan Details
  plan: {
    type: String,
    enum: ['free', 'starter', 'pro', 'enterprise'],
    required: true,
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'past_due', 'trialing', 'paused'],
    default: 'active',
  },

  // Dates
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  trialStartDate: {
    type: Date,
  },
  trialEndDate: {
    type: Date,
  },
  cancelledAt: {
    type: Date,
  },
  cancelReason: {
    type: String,
  },

  // Razorpay
  razorpay: {
    subscriptionId: String,
    customerId: String,
    planId: String,
    paymentId: String,
    shortUrl: String,
  },

  // Pricing
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  discount: {
    code: String,
    percentage: Number,
    amount: Number,
  },

  // Renewal
  autoRenew: {
    type: Boolean,
    default: true,
  },
  nextBillingDate: {
    type: Date,
  },

  // Upgrade/Downgrade
  previousPlan: {
    type: String,
  },
  changeType: {
    type: String,
    enum: ['new', 'upgrade', 'downgrade', 'renewal', 'reactivation'],
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Payment History Schema
const paymentSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },

  // Payment Details
  type: {
    type: String,
    enum: ['subscription', 'one_time', 'addon', 'refund'],
    default: 'subscription',
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
  },

  // Razorpay
  razorpay: {
    paymentId: String,
    orderId: String,
    signature: String,
    method: String,
    bank: String,
    wallet: String,
    vpa: String,
  },

  // Invoice
  invoiceNumber: String,
  invoiceUrl: String,

  // Tax
  taxAmount: {
    type: Number,
    default: 0,
  },
  taxRate: {
    type: Number,
    default: 18, // GST
  },

  // Dates
  paidAt: Date,
  refundedAt: Date,

  // Metadata
  description: String,
  metadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
});

// Discount/Coupon Schema
const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  description: String,

  // Discount
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
  },
  maxDiscount: {
    type: Number, // Cap for percentage discounts
  },

  // Validity
  validFrom: {
    type: Date,
    default: Date.now,
  },
  validUntil: {
    type: Date,
  },
  maxUses: {
    type: Number,
    default: -1, // -1 = unlimited
  },
  usedCount: {
    type: Number,
    default: 0,
  },

  // Restrictions
  applicablePlans: [{
    type: String,
    enum: ['starter', 'pro', 'enterprise'],
  }],
  applicableBillingCycles: [{
    type: String,
    enum: ['monthly', 'yearly'],
  }],
  minAmount: {
    type: Number,
    default: 0,
  },
  firstTimeOnly: {
    type: Boolean,
    default: false,
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },

  // Tracking
  usedBy: [{
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    usedAt: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

// Methods for coupon validation
couponSchema.methods.isValid = function(plan, billingCycle, amount, tenantId) {
  const now = new Date();

  // Check if active
  if (!this.isActive) return { valid: false, error: 'Coupon is inactive' };

  // Check date validity
  if (this.validFrom && now < this.validFrom) {
    return { valid: false, error: 'Coupon is not yet valid' };
  }
  if (this.validUntil && now > this.validUntil) {
    return { valid: false, error: 'Coupon has expired' };
  }

  // Check usage limit
  if (this.maxUses !== -1 && this.usedCount >= this.maxUses) {
    return { valid: false, error: 'Coupon usage limit reached' };
  }

  // Check plan restriction
  if (this.applicablePlans.length > 0 && !this.applicablePlans.includes(plan)) {
    return { valid: false, error: 'Coupon not valid for this plan' };
  }

  // Check billing cycle restriction
  if (this.applicableBillingCycles.length > 0 && !this.applicableBillingCycles.includes(billingCycle)) {
    return { valid: false, error: 'Coupon not valid for this billing cycle' };
  }

  // Check minimum amount
  if (this.minAmount > 0 && amount < this.minAmount) {
    return { valid: false, error: `Minimum order amount is ₹${this.minAmount}` };
  }

  // Check first-time only
  if (this.firstTimeOnly && tenantId) {
    const alreadyUsed = this.usedBy.some(u => u.tenant.toString() === tenantId.toString());
    if (alreadyUsed) {
      return { valid: false, error: 'Coupon can only be used once per account' };
    }
  }

  return { valid: true };
};

couponSchema.methods.calculateDiscount = function(amount) {
  let discount = 0;

  if (this.discountType === 'percentage') {
    discount = (amount * this.discountValue) / 100;
    if (this.maxDiscount && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
  } else {
    discount = this.discountValue;
  }

  return Math.min(discount, amount);
};

// Indexes
subscriptionSchema.index({ tenant: 1, status: 1 });
subscriptionSchema.index({ 'razorpay.subscriptionId': 1 });
paymentSchema.index({ tenant: 1, status: 1 });
paymentSchema.index({ 'razorpay.paymentId': 1 });
couponSchema.index({ code: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
const SubscriptionPayment = mongoose.model('SubscriptionPayment', paymentSchema);
const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = {
  Subscription,
  SubscriptionPayment,
  Coupon,
  SUBSCRIPTION_PLANS,
};
