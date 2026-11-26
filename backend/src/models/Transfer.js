const mongoose = require('mongoose');

const transferItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: String,
  sku: String,
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  receivedQuantity: {
    type: Number,
    default: 0,
  },
  notes: String,
});

const transferSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  transferNumber: {
    type: String,
    required: true,
  },
  fromWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, 'Source warehouse is required'],
  },
  fromWarehouseName: String,
  toWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, 'Destination warehouse is required'],
  },
  toWarehouseName: String,
  items: [transferItemSchema],
  status: {
    type: String,
    enum: ['draft', 'pending', 'in_transit', 'partial', 'completed', 'cancelled'],
    default: 'draft',
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  reason: {
    type: String,
    enum: ['restock', 'rebalance', 'customer_order', 'return', 'damage', 'other'],
    default: 'restock',
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
  requestedDate: {
    type: Date,
    default: Date.now,
  },
  expectedDeliveryDate: {
    type: Date,
  },
  shippedDate: {
    type: Date,
  },
  receivedDate: {
    type: Date,
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  shippedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  trackingInfo: {
    carrier: String,
    trackingNumber: String,
    vehicleNumber: String,
    driverName: String,
    driverPhone: String,
  },
}, {
  timestamps: true,
});

// Indexes
transferSchema.index({ transferNumber: 1, tenant: 1 }, { unique: true });
transferSchema.index({ status: 1, createdAt: -1 });
transferSchema.index({ fromWarehouse: 1, toWarehouse: 1 });

// Generate transfer number
transferSchema.pre('validate', async function() {
  if (!this.transferNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await this.constructor.countDocuments({
      tenant: this.tenant,
      createdAt: {
        $gte: new Date(year, date.getMonth(), 1),
        $lt: new Date(year, date.getMonth() + 1, 1),
      },
    });
    this.transferNumber = `TRF/${year}-${month}/${String(count + 1).padStart(4, '0')}`;
  }
});

// Virtual for total items count
transferSchema.virtual('totalItems').get(function() {
  return (this.items || []).reduce((sum, item) => sum + item.quantity, 0);
});

transferSchema.virtual('totalReceivedItems').get(function() {
  return (this.items || []).reduce((sum, item) => sum + item.receivedQuantity, 0);
});

// Ensure virtuals are included in JSON
transferSchema.set('toJSON', { virtuals: true });
transferSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Transfer', transferSchema);
