const mongoose = require('mongoose');

const productionSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },

  // Production Details
  productionNumber: {
    type: String,
    required: true,
    unique: true,
  },
  productionDate: {
    type: Date,
    required: [true, 'Production date is required'],
    default: Date.now,
  },
  shift: {
    type: String,
    enum: ['morning', 'afternoon', 'night'],
    required: [true, 'Shift is required'],
  },

  // Product Information
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required'],
  },
  batchNumber: {
    type: String,
    required: [true, 'Batch number is required'],
    trim: true,
  },
  lotNumber: {
    type: String,
    trim: true,
  },

  // Quantities
  plannedQuantity: {
    type: Number,
    required: [true, 'Planned quantity is required'],
    min: [0, 'Planned quantity cannot be negative'],
  },
  producedQuantity: {
    type: Number,
    required: [true, 'Produced quantity is required'],
    min: [0, 'Produced quantity cannot be negative'],
    default: 0,
  },
  rejectedQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Rejected quantity cannot be negative'],
  },
  goodQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Good quantity cannot be negative'],
  },

  // Quality Control
  rejectionReason: {
    type: String,
    trim: true,
  },
  qualityCheckedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  qualityStatus: {
    type: String,
    enum: ['pending', 'passed', 'failed', 'partial'],
    default: 'pending',
  },

  // Material Consumption
  materialsConsumed: [{
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',  // Raw materials are also products
      required: true,
    },
    quantityUsed: {
      type: Number,
      required: true,
      min: [0, 'Quantity used cannot be negative'],
    },
    unit: {
      type: String,
      default: 'PCS',
    },
    cost: {
      type: Number,
      default: 0,
    },
  }],

  // Manufacturing Details
  manufacturingDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
  },

  // Warehouse/Location
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
  },
  storageLocation: {
    type: String,
    trim: true,
  },

  // Production Staff
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  operators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  // Costs
  productionCost: {
    materialCost: {
      type: Number,
      default: 0,
    },
    laborCost: {
      type: Number,
      default: 0,
    },
    overheadCost: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },
  },

  // Status
  status: {
    type: String,
    enum: ['planned', 'in_progress', 'completed', 'cancelled'],
    default: 'planned',
  },

  // Notes
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },

  // Timestamps
  startTime: {
    type: Date,
  },
  endTime: {
    type: Date,
  },

  // Created/Modified by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Compound unique index for production number within tenant
productionSchema.index({ productionNumber: 1, tenant: 1 }, { unique: true });

// Indexes for queries
productionSchema.index({ productionDate: -1 });
productionSchema.index({ status: 1 });
productionSchema.index({ product: 1 });
productionSchema.index({ batchNumber: 1 });

// Virtual for efficiency calculation
productionSchema.virtual('efficiency').get(function() {
  if (this.plannedQuantity === 0) return 0;
  return ((this.goodQuantity / this.plannedQuantity) * 100).toFixed(2);
});

// Virtual for rejection rate
productionSchema.virtual('rejectionRate').get(function() {
  if (this.producedQuantity === 0) return 0;
  return ((this.rejectedQuantity / this.producedQuantity) * 100).toFixed(2);
});

// Pre-save middleware to auto-generate production number
productionSchema.pre('save', async function(next) {
  if (!this.productionNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Find the last production number for this month
    const lastProduction = await this.constructor
      .findOne({
        tenant: this.tenant,
        productionNumber: new RegExp(`^PRD-${year}${month}`)
      })
      .sort({ productionNumber: -1 });

    let sequence = 1;
    if (lastProduction && lastProduction.productionNumber) {
      const lastSequence = parseInt(lastProduction.productionNumber.split('-').pop());
      sequence = lastSequence + 1;
    }

    this.productionNumber = `PRD-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  // Calculate good quantity
  this.goodQuantity = this.producedQuantity - this.rejectedQuantity;

  // Calculate total material cost
  if (this.materialsConsumed && this.materialsConsumed.length > 0) {
    this.productionCost.materialCost = this.materialsConsumed.reduce(
      (sum, item) => sum + (item.cost || 0),
      0
    );
  }

  // Calculate total production cost
  this.productionCost.totalCost =
    this.productionCost.materialCost +
    this.productionCost.laborCost +
    this.productionCost.overheadCost;

  next();
});

// Method to complete production
productionSchema.methods.complete = async function() {
  this.status = 'completed';
  this.endTime = new Date();

  // Update finished goods stock
  const Product = mongoose.model('Product');
  await Product.findByIdAndUpdate(
    this.product,
    { $inc: { quantity: this.goodQuantity } }
  );

  // Update raw material stock
  for (const material of this.materialsConsumed) {
    await Product.findByIdAndUpdate(
      material.material,
      { $inc: { quantity: -material.quantityUsed } }
    );
  }

  return await this.save();
};

// Method to calculate unit cost
productionSchema.methods.calculateUnitCost = function() {
  if (this.goodQuantity === 0) return 0;
  return (this.productionCost.totalCost / this.goodQuantity).toFixed(2);
};

module.exports = mongoose.model('Production', productionSchema);
