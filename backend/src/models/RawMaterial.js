const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },

  // Basic Information
  code: {
    type: String,
    required: [true, 'Material code is required'],
    uppercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Material name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters'],
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },

  // Category
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'bottles',          // PET bottles (250ml, 500ml, 1L, 2L, 20L jars)
      'caps',            // Bottle caps and closures
      'labels',          // Product labels and stickers
      'packaging',       // Cartons, shrink wrap, crates
      'raw_water',       // Source water
      'chemicals',       // Purification chemicals
      'filters',         // Water filters and cartridges
      'consumables',     // General consumables
      'spares',          // Machine spare parts
      'others',
    ],
  },

  // Type/Specification
  specification: {
    type: String,
    trim: true,
  },

  // Unit of Measurement
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['PCS', 'KG', 'LTR', 'MTR', 'ROLL', 'SET', 'BOX', 'CARTON', 'BAG'],
    default: 'PCS',
  },

  // Stock Information
  currentStock: {
    type: Number,
    required: true,
    min: [0, 'Stock cannot be negative'],
    default: 0,
  },
  minimumStock: {
    type: Number,
    required: [true, 'Minimum stock level is required'],
    min: [0, 'Minimum stock cannot be negative'],
    default: 0,
  },
  reorderLevel: {
    type: Number,
    required: [true, 'Reorder level is required'],
    min: [0, 'Reorder level cannot be negative'],
    default: 0,
  },
  reorderQuantity: {
    type: Number,
    min: [0, 'Reorder quantity cannot be negative'],
    default: 0,
  },

  // Pricing
  unitCost: {
    type: Number,
    required: [true, 'Unit cost is required'],
    min: [0, 'Unit cost cannot be negative'],
    default: 0,
  },
  lastPurchasePrice: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    default: 0,
  },
  averageCost: {
    type: Number,
    min: [0, 'Average cost cannot be negative'],
    default: 0,
  },

  // Supplier Information
  primarySupplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  alternateSuppliers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  }],

  // Storage Details
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
  },
  storageLocation: {
    zone: String,
    rack: String,
    bin: String,
  },

  // Quality & Compliance
  qualityGrade: {
    type: String,
    enum: ['A', 'B', 'C'],
    default: 'A',
  },
  certifications: [{
    type: String,
  }],
  shelfLife: {
    type: Number,  // in days
    min: 0,
  },

  // Tracking
  batchTracking: {
    type: Boolean,
    default: false,
  },
  serialTracking: {
    type: Boolean,
    default: false,
  },

  // HSN Code (for GST)
  hsnCode: {
    type: String,
    trim: true,
  },
  taxRate: {
    type: Number,
    default: 18,  // GST percentage
    min: [0, 'Tax rate cannot be negative'],
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },

  // Last Purchase Information
  lastPurchaseDate: {
    type: Date,
  },
  lastPurchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
  },

  // Notes
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },

  // Created/Modified by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Compound unique index for material code within tenant
rawMaterialSchema.index({ code: 1, tenant: 1 }, { unique: true });

// Indexes for queries
rawMaterialSchema.index({ name: 'text', description: 'text', code: 'text' });
rawMaterialSchema.index({ category: 1 });
rawMaterialSchema.index({ isActive: 1 });

// Virtual for low stock warning
rawMaterialSchema.virtual('isLowStock').get(function() {
  return this.currentStock <= this.reorderLevel;
});

// Virtual for out of stock
rawMaterialSchema.virtual('isOutOfStock').get(function() {
  return this.currentStock === 0;
});

// Virtual for stock status
rawMaterialSchema.virtual('stockStatus').get(function() {
  if (this.currentStock === 0) return 'out_of_stock';
  if (this.currentStock <= this.minimumStock) return 'critical';
  if (this.currentStock <= this.reorderLevel) return 'low';
  return 'adequate';
});

// Virtual for stock value
rawMaterialSchema.virtual('stockValue').get(function() {
  return this.currentStock * this.unitCost;
});

// Pre-save middleware to auto-generate material code
rawMaterialSchema.pre('save', async function(next) {
  if (!this.code) {
    const prefix = 'RM';
    const categoryPrefix = this.category.substring(0, 3).toUpperCase();

    // Find the last material code
    const lastMaterial = await this.constructor
      .findOne({
        tenant: this.tenant,
        code: new RegExp(`^${prefix}-${categoryPrefix}`)
      })
      .sort({ code: -1 });

    let sequence = 1;
    if (lastMaterial && lastMaterial.code) {
      const lastSequence = parseInt(lastMaterial.code.split('-').pop());
      sequence = lastSequence + 1;
    }

    this.code = `${prefix}-${categoryPrefix}-${String(sequence).padStart(5, '0')}`;
  }

  next();
});

// Method to update stock
rawMaterialSchema.methods.updateStock = async function(quantity, operation = 'add') {
  if (operation === 'add') {
    this.currentStock += quantity;
  } else if (operation === 'subtract') {
    if (this.currentStock < quantity) {
      throw new Error('Insufficient stock');
    }
    this.currentStock -= quantity;
  }

  return await this.save();
};

// Method to check if reorder is needed
rawMaterialSchema.methods.needsReorder = function() {
  return this.currentStock <= this.reorderLevel;
};

// Static method to get low stock materials
rawMaterialSchema.statics.getLowStockMaterials = function(tenantId) {
  return this.find({
    tenant: tenantId,
    isActive: true,
    $expr: { $lte: ['$currentStock', '$reorderLevel'] }
  }).populate('primarySupplier');
};

// Static method to get out of stock materials
rawMaterialSchema.statics.getOutOfStockMaterials = function(tenantId) {
  return this.find({
    tenant: tenantId,
    isActive: true,
    currentStock: 0
  }).populate('primarySupplier');
};

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
