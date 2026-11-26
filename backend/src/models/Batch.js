const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    // Multi-tenancy
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: String,
    productSku: String,

    batchNumber: {
      type: String,
      required: true,
    },
    lotNumber: String,

    // Dates
    manufacturingDate: Date,
    expiryDate: {
      type: Date,
      required: true,
    },
    receivedDate: {
      type: Date,
      default: Date.now,
    },

    // Quantities
    initialQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    currentQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Pricing
    costPerUnit: {
      type: Number,
      min: 0,
    },
    totalCost: Number,

    // Location
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    warehouseName: String,
    location: {
      zone: String,
      shelf: String,
      rack: String,
      bin: String,
    },

    // Source
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    supplierName: String,
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
    poNumber: String,

    // Status
    status: {
      type: String,
      enum: ['active', 'low', 'expired', 'quarantine', 'depleted'],
      default: 'active',
    },

    // Expiry alerts
    expiryAlerts: [
      {
        daysRemaining: Number,
        alertSent: Boolean,
        sentAt: Date,
        alertType: {
          type: String,
          enum: ['30_days', '15_days', '7_days', 'expired'],
        },
      },
    ],

    // Quality
    qualityCheck: {
      passed: Boolean,
      checkedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      checkedAt: Date,
      notes: String,
    },

    // Metadata
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for unique batch per product per tenant
batchSchema.index({ product: 1, batchNumber: 1, tenant: 1 }, { unique: true });
batchSchema.index({ expiryDate: 1 });
batchSchema.index({ status: 1 });
batchSchema.index({ warehouse: 1 });
batchSchema.index({ currentQuantity: 1 });

// Virtual for available quantity
batchSchema.virtual('availableQuantity').get(function () {
  return this.currentQuantity - (this.reservedQuantity || 0);
});

// Virtual for is expired
batchSchema.virtual('isExpired').get(function () {
  return this.expiryDate < new Date();
});

// Virtual for days until expiry
batchSchema.virtual('daysUntilExpiry').get(function () {
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for expiry status
batchSchema.virtual('expiryStatus').get(function () {
  const days = this.daysUntilExpiry;
  if (days <= 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 15) return 'warning';
  if (days <= 30) return 'attention';
  return 'ok';
});

// Pre-save hook to update status
batchSchema.pre('save', function () {
  // Update status based on quantity and expiry
  if (this.currentQuantity <= 0) {
    this.status = 'depleted';
  } else if (this.isExpired) {
    this.status = 'expired';
  } else if (this.status !== 'quarantine') {
    this.status = 'active';
  }

  // Calculate total cost
  if (this.costPerUnit && this.initialQuantity) {
    this.totalCost = this.costPerUnit * this.initialQuantity;
  }

});

// Static method to get batches expiring soon
batchSchema.statics.getExpiringBatches = async function (days = 30, warehouseId = null, tenantId = null) {
  const query = {
    expiryDate: {
      $lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      $gte: new Date(),
    },
    currentQuantity: { $gt: 0 },
    status: { $ne: 'depleted' },
  };

  if (warehouseId) {
    query.warehouse = warehouseId;
  }
  if (tenantId) {
    query.tenant = tenantId;
  }

  return this.find(query)
    .populate('product', 'name sku category')
    .populate('warehouse', 'name code')
    .sort({ expiryDate: 1 });
};

// Static method to get expired batches
batchSchema.statics.getExpiredBatches = async function (warehouseId = null, tenantId = null) {
  const query = {
    expiryDate: { $lt: new Date() },
    currentQuantity: { $gt: 0 },
  };

  if (warehouseId) {
    query.warehouse = warehouseId;
  }
  if (tenantId) {
    query.tenant = tenantId;
  }

  return this.find(query)
    .populate('product', 'name sku category')
    .populate('warehouse', 'name code')
    .sort({ expiryDate: 1 });
};

// Static method for FIFO selection (First Expiry First Out)
batchSchema.statics.selectBatchesFIFO = async function (productId, quantity, warehouseId = null, tenantId = null) {
  const query = {
    product: productId,
    currentQuantity: { $gt: 0 },
    status: 'active',
    expiryDate: { $gt: new Date() }, // Not expired
  };

  if (warehouseId) {
    query.warehouse = warehouseId;
  }
  if (tenantId) {
    query.tenant = tenantId;
  }

  const batches = await this.find(query).sort({ expiryDate: 1 }); // Sort by earliest expiry first

  const selectedBatches = [];
  let remainingQuantity = quantity;

  for (const batch of batches) {
    if (remainingQuantity <= 0) break;

    const available = batch.availableQuantity;
    const toTake = Math.min(available, remainingQuantity);

    if (toTake > 0) {
      selectedBatches.push({
        batch: batch,
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        quantityToDeduct: toTake,
        expiryDate: batch.expiryDate,
      });
      remainingQuantity -= toTake;
    }
  }

  return {
    selectedBatches,
    fulfilled: remainingQuantity <= 0,
    shortfall: Math.max(0, remainingQuantity),
  };
};

module.exports = mongoose.model('Batch', batchSchema);
