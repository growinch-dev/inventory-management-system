const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  // Company Information
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [200, 'Company name cannot exceed 200 characters'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Company email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
  },

  // Address
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
  },

  // Business Details
  gstNumber: {
    type: String,
    trim: true,
  },
  panNumber: {
    type: String,
    trim: true,
  },
  // Shown on invoices ("Bank Details" block)
  bankDetails: {
    bankName: { type: String, trim: true },
    accountName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true, uppercase: true },
    branch: { type: String, trim: true },
    upiId: { type: String, trim: true },
  },
  businessType: {
    type: String,
    enum: ['sole_proprietorship', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'other'],
    default: 'pvt_ltd',
  },

  // Owner/Admin
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Set after user creation
  },

  // Subscription
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'past_due', 'trialing'],
      default: 'trialing',
    },
    trialEndsAt: {
      type: Date,
    },
    currentPeriodStart: {
      type: Date,
    },
    currentPeriodEnd: {
      type: Date,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
  },

  // Plan Limits (will be set based on subscription plan)
  limits: {
    maxProducts: { type: Number, default: 50 },
    maxUsers: { type: Number, default: 1 },
    maxInvoicesPerMonth: { type: Number, default: 20 },
    maxWarehouses: { type: Number, default: 1 },
    maxSuppliers: { type: Number, default: 10 },
    maxCustomers: { type: Number, default: 20 },
    features: {
      multiWarehouse: { type: Boolean, default: false },
      batchTracking: { type: Boolean, default: false },
      tenderManagement: { type: Boolean, default: false },
      demoIssueTracking: { type: Boolean, default: false },
      advancedReports: { type: Boolean, default: false },
      emailNotifications: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      whiteLabeling: { type: Boolean, default: false },
    },
  },

  // Usage Tracking
  usage: {
    productsCount: { type: Number, default: 0 },
    usersCount: { type: Number, default: 1 },
    invoicesThisMonth: { type: Number, default: 0 },
    lastInvoiceReset: { type: Date, default: Date.now },
    warehousesCount: { type: Number, default: 1 },
    suppliersCount: { type: Number, default: 0 },
    customersCount: { type: Number, default: 0 },
  },

  // Billing
  billing: {
    razorpayCustomerId: String,
    razorpaySubscriptionId: String,
    billingEmail: String,
    billingAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
    },
  },

  // Settings
  settings: {
    currency: { type: String, default: 'INR' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    language: { type: String, default: 'en' },
    invoicePrefix: { type: String, default: 'INV' },
    purchaseOrderPrefix: { type: String, default: 'PO' },
    logo: String,
    primaryColor: { type: String, default: '#6366F1' },
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verifiedAt: Date,

  // Onboarding
  onboarding: {
    completed: { type: Boolean, default: false },
    steps: {
      companyProfile: { type: Boolean, default: false },
      firstProduct: { type: Boolean, default: false },
      firstSupplier: { type: Boolean, default: false },
      firstCustomer: { type: Boolean, default: false },
      firstInvoice: { type: Boolean, default: false },
    },
  },
}, {
  timestamps: true,
});

// Generate slug from company name
tenantSchema.pre('save', async function() {
  if (this.isModified('name') || !this.slug) {
    let baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);

    // Ensure unique slug
    let slug = baseSlug;
    let counter = 1;
    while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }
});

// Set trial end date for new tenants
tenantSchema.pre('save', function() {
  if (this.isNew && !this.subscription.trialEndsAt) {
    // 14-day free trial
    this.subscription.trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    this.subscription.status = 'trialing';
  }
});

// Update limits based on plan
tenantSchema.methods.updateLimitsForPlan = function(plan) {
  const planLimits = {
    free: {
      maxProducts: 50,
      maxUsers: 1,
      maxInvoicesPerMonth: 20,
      maxWarehouses: 1,
      maxSuppliers: 10,
      maxCustomers: 20,
      features: {
        multiWarehouse: false,
        batchTracking: false,
        tenderManagement: false,
        demoIssueTracking: false,
        advancedReports: false,
        emailNotifications: false,
        apiAccess: false,
        whiteLabeling: false,
      },
    },
    starter: {
      maxProducts: 500,
      maxUsers: 3,
      maxInvoicesPerMonth: 100,
      maxWarehouses: 2,
      maxSuppliers: 50,
      maxCustomers: 100,
      features: {
        multiWarehouse: true,
        batchTracking: true,
        tenderManagement: false,
        demoIssueTracking: false,
        advancedReports: false,
        emailNotifications: true,
        apiAccess: false,
        whiteLabeling: false,
      },
    },
    pro: {
      maxProducts: 5000,
      maxUsers: 10,
      maxInvoicesPerMonth: -1, // unlimited
      maxWarehouses: 5,
      maxSuppliers: -1,
      maxCustomers: -1,
      features: {
        multiWarehouse: true,
        batchTracking: true,
        tenderManagement: true,
        demoIssueTracking: true,
        advancedReports: true,
        emailNotifications: true,
        apiAccess: true,
        whiteLabeling: false,
      },
    },
    enterprise: {
      maxProducts: -1,
      maxUsers: -1,
      maxInvoicesPerMonth: -1,
      maxWarehouses: -1,
      maxSuppliers: -1,
      maxCustomers: -1,
      features: {
        multiWarehouse: true,
        batchTracking: true,
        tenderManagement: true,
        demoIssueTracking: true,
        advancedReports: true,
        emailNotifications: true,
        apiAccess: true,
        whiteLabeling: true,
      },
    },
  };

  this.limits = planLimits[plan] || planLimits.free;
  this.subscription.plan = plan;
};

// Check if tenant can add more of a resource
tenantSchema.methods.canAdd = function(resourceType) {
  const limitMap = {
    product: { limit: 'maxProducts', usage: 'productsCount' },
    user: { limit: 'maxUsers', usage: 'usersCount' },
    invoice: { limit: 'maxInvoicesPerMonth', usage: 'invoicesThisMonth' },
    warehouse: { limit: 'maxWarehouses', usage: 'warehousesCount' },
    supplier: { limit: 'maxSuppliers', usage: 'suppliersCount' },
    customer: { limit: 'maxCustomers', usage: 'customersCount' },
  };

  const mapping = limitMap[resourceType];
  if (!mapping) return true;

  const limit = this.limits[mapping.limit];
  const current = this.usage[mapping.usage];

  // -1 means unlimited
  if (limit === -1) return true;

  return current < limit;
};

// Check if tenant has a feature
tenantSchema.methods.hasFeature = function(featureName) {
  return this.limits.features[featureName] === true;
};

// Check subscription status
tenantSchema.methods.isSubscriptionActive = function() {
  if (this.subscription.status === 'active') return true;
  if (this.subscription.status === 'trialing') {
    return new Date() < new Date(this.subscription.trialEndsAt);
  }
  return false;
};

// Increment usage
tenantSchema.methods.incrementUsage = async function(resourceType, amount = 1) {
  const usageField = {
    product: 'usage.productsCount',
    user: 'usage.usersCount',
    invoice: 'usage.invoicesThisMonth',
    warehouse: 'usage.warehousesCount',
    supplier: 'usage.suppliersCount',
    customer: 'usage.customersCount',
  };

  const field = usageField[resourceType];
  if (field) {
    await this.constructor.updateOne(
      { _id: this._id },
      { $inc: { [field]: amount } }
    );
  }
};

// Decrement usage
tenantSchema.methods.decrementUsage = async function(resourceType, amount = 1) {
  await this.incrementUsage(resourceType, -amount);
};

// Reset monthly invoice count (called by cron job)
tenantSchema.statics.resetMonthlyInvoiceCounts = async function() {
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  await this.updateMany(
    { 'usage.lastInvoiceReset': { $lt: firstOfMonth } },
    {
      $set: {
        'usage.invoicesThisMonth': 0,
        'usage.lastInvoiceReset': new Date(),
      },
    }
  );
};

// Indexes
tenantSchema.index({ slug: 1 });
tenantSchema.index({ email: 1 });
tenantSchema.index({ owner: 1 });
tenantSchema.index({ 'subscription.status': 1 });
tenantSchema.index({ isActive: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);
