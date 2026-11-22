const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  code: {
    type: String,
    required: [true, 'Warehouse code is required'],
    uppercase: true,
    trim: true,
    maxlength: [10, 'Code cannot exceed 10 characters'],
  },
  name: {
    type: String,
    required: [true, 'Warehouse name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  type: {
    type: String,
    required: true,
    enum: ['main', 'distribution', 'regional', 'returns', 'quarantine'],
    default: 'distribution',
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, trim: true },
    country: { type: String, default: 'India', trim: true },
  },
  contactPerson: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  capacity: {
    maxItems: { type: Number, default: 10000 },
    currentItems: { type: Number, default: 0 },
    utilizationPercent: { type: Number, default: 0 },
  },
  zones: [{
    code: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['storage', 'receiving', 'shipping', 'quarantine', 'returns'],
      default: 'storage'
    },
  }],
  operatingHours: {
    weekdays: { open: String, close: String },
    weekends: { open: String, close: String },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Compound index for unique code per tenant
warehouseSchema.index({ code: 1, tenant: 1 }, { unique: true });

// Index for search
warehouseSchema.index({ name: 'text', code: 'text', 'address.city': 'text' });

// Ensure only one default warehouse per tenant
warehouseSchema.pre('save', async function() {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, tenant: this.tenant, isDefault: true },
      { isDefault: false }
    );
  }
});

// Virtual for full address
warehouseSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return [addr.street, addr.city, addr.state, addr.pincode, addr.country]
    .filter(Boolean)
    .join(', ');
});

// Ensure virtuals are included in JSON
warehouseSchema.set('toJSON', { virtuals: true });
warehouseSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Warehouse', warehouseSchema);
