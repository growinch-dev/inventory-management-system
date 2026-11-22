const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // Company Information
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Company name is required' },
      len: { args: [1, 200], msg: 'Company name cannot exceed 200 characters' },
    },
  },
  slug: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: { msg: 'Please provide a valid email' },
    },
  },
  phone: DataTypes.STRING(20),
  website: DataTypes.STRING(255),

  // Address (stored as JSONB for flexibility)
  address: {
    type: DataTypes.JSONB,
    defaultValue: {
      street: null,
      city: null,
      state: null,
      pincode: null,
      country: 'India',
    },
  },

  // Business Details
  gst_number: DataTypes.STRING(50),
  pan_number: DataTypes.STRING(50),
  business_type: {
    type: DataTypes.ENUM('sole_proprietorship', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'other'),
    defaultValue: 'pvt_ltd',
  },

  // Subscription (stored as JSONB)
  subscription: {
    type: DataTypes.JSONB,
    defaultValue: {
      plan: 'free',
      status: 'trialing',
      trialEndsAt: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  },

  // Plan Limits (stored as JSONB)
  limits: {
    type: DataTypes.JSONB,
    defaultValue: {
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
  },

  // Usage Tracking (stored as JSONB)
  usage: {
    type: DataTypes.JSONB,
    defaultValue: {
      productsCount: 0,
      usersCount: 1,
      invoicesThisMonth: 0,
      lastInvoiceReset: new Date(),
      warehousesCount: 1,
      suppliersCount: 0,
      customersCount: 0,
    },
  },

  // Billing (stored as JSONB)
  billing: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },

  // Settings (stored as JSONB)
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      currency: 'INR',
      dateFormat: 'DD/MM/YYYY',
      timezone: 'Asia/Kolkata',
      language: 'en',
      invoicePrefix: 'INV',
      purchaseOrderPrefix: 'PO',
      logo: null,
      primaryColor: '#6366F1',
    },
  },

  // Status
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  verified_at: DataTypes.DATE,

  // Onboarding (stored as JSONB)
  onboarding: {
    type: DataTypes.JSONB,
    defaultValue: {
      completed: false,
      steps: {
        companyProfile: false,
        firstProduct: false,
        firstSupplier: false,
        firstCustomer: false,
        firstInvoice: false,
      },
    },
  },
}, {
  tableName: 'tenants',
  indexes: [
    { fields: ['slug'] },
    { fields: ['email'] },
    { fields: ['is_active'] },
  ],
});

// Instance Methods
Tenant.prototype.updateLimitsForPlan = function(plan) {
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
      maxInvoicesPerMonth: -1,
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
  this.subscription = { ...this.subscription, plan };
  this.changed('limits', true);
  this.changed('subscription', true);
};

Tenant.prototype.canAdd = function(resourceType) {
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

  if (limit === -1) return true;
  return current < limit;
};

Tenant.prototype.hasFeature = function(featureName) {
  return this.limits.features[featureName] === true;
};

Tenant.prototype.isSubscriptionActive = function() {
  if (this.subscription.status === 'active') return true;
  if (this.subscription.status === 'trialing') {
    return new Date() < new Date(this.subscription.trialEndsAt);
  }
  return false;
};

Tenant.prototype.incrementUsage = async function(resourceType, amount = 1) {
  const usageMap = {
    product: 'productsCount',
    user: 'usersCount',
    invoice: 'invoicesThisMonth',
    warehouse: 'warehousesCount',
    supplier: 'suppliersCount',
    customer: 'customersCount',
  };

  const field = usageMap[resourceType];
  if (field && this.usage[field] !== undefined) {
    this.usage[field] += amount;
    this.changed('usage', true);
    await this.save();
  }
};

Tenant.prototype.decrementUsage = async function(resourceType, amount = 1) {
  await this.incrementUsage(resourceType, -amount);
};

// Hooks
Tenant.beforeCreate(async (tenant) => {
  // Generate slug
  if (!tenant.slug && tenant.name) {
    let baseSlug = tenant.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);

    let slug = baseSlug;
    let counter = 1;
    while (await Tenant.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    tenant.slug = slug;
  }

  // Set trial end date
  if (!tenant.subscription.trialEndsAt) {
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    tenant.subscription = {
      ...tenant.subscription,
      trialEndsAt,
      status: 'trialing',
    };
  }
});

module.exports = Tenant;
