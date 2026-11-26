const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    uppercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters'],
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  category: {
    // A category "value" (slug). The defaults are the mineral-water and
    // raw-material categories; a tenant can add more via the Categories page,
    // so this is a free string rather than a fixed enum.
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  // Product Type (for manufacturing)
  productType: {
    type: String,
    enum: ['finished_good', 'raw_material', 'work_in_progress', 'other'],
    default: 'other',
  },
  // Bottle Size (for water products)
  bottleSize: {
    size: {
      type: Number,  // 250, 500, 1000, 2000, 20000 (in ml)
    },
    unit: {
      type: String,
      enum: ['ml', 'l'],
      default: 'ml',
    },
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [100, 'Brand name cannot exceed 100 characters'],
  },
  manufacturer: {
    name: {
      type: String,
      trim: true,
      maxlength: [200, 'Manufacturer name cannot exceed 200 characters'],
    },
    address: String,
    country: {
      type: String,
      default: 'India',
    },
    contact: String,
    website: String,
    licenseNumber: String,  // For medical devices
  },
  modelNumber: {
    type: String,
    trim: true,
  },
  hsnCode: {
    type: String,
    trim: true,
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Price cannot be negative'],
  },
  costPrice: {
    type: Number,
    min: [0, 'Cost price cannot be negative'],
    default: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative'],
    default: 0,
  },
  reorderLevel: {
    type: Number,
    default: 10,
    min: [0, 'Reorder level cannot be negative'],
  },
  unit: {
    type: String,
    default: 'PCS',
    enum: ['PCS', 'SET', 'BOX', 'CARTON', 'CRATE', 'PAIR', 'KG', 'MTR', 'LTR', 'ROLL', 'BAG'],
  },
  images: [{
    type: String,
  }],
  qrCode: {
    type: String,
  },
  barcode: {
    type: String,
    trim: true,
    sparse: true,
    index: true,
  },
  serialNumber: {
    type: String,
    trim: true,
    sparse: true,
  },
  batchNumber: {
    type: String,
  },
  lotNumber: {
    type: String,
    trim: true,
  },
  manufacturingDate: {
    type: Date,
  },
  expiryDate: {
    type: Date,
  },
  countryOfOrigin: {
    type: String,
    trim: true,
    default: 'India',
  },
  location: {
    warehouse: { type: String, default: 'Main' },
    zone: { type: String },
    shelf: { type: String },
    rack: { type: String },
    bin: { type: String },
  },
  warehouseRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
  },
  taxRate: {
    type: Number,
    default: 18, // GST percentage
    min: [0, 'Tax rate cannot be negative'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Compound unique index for SKU within tenant
productSchema.index({ sku: 1, tenant: 1 }, { unique: true });

// Index for search
productSchema.index({ name: 'text', description: 'text', sku: 'text' });

// Virtual for low stock check
productSchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.reorderLevel;
});

// Pre-save to generate SKU if not provided (scoped to tenant)
productSchema.pre('save', async function() {
  if (!this.sku) {
    const prefix = this.category.substring(0, 3).toUpperCase();
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.sku = `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
});

module.exports = mongoose.model('Product', productSchema);
