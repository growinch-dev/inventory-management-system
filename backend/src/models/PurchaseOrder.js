const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: String,
  sku: String,
  hsnCode: String,
  description: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  receivedQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  unit: {
    type: String,
    default: 'PCS',
  },
  rate: {
    type: Number,
    required: true,
    min: 0,
  },
  taxRate: {
    type: Number,
    default: 18,
  },
  taxableAmount: Number,
  taxAmount: Number,
  totalAmount: Number,
  // Batch tracking
  batchNumber: String,
  manufacturingDate: Date,
  expiryDate: Date,
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    // Multi-tenancy
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    poNumber: {
      type: String,
      required: true,
    },
    poDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedDeliveryDate: Date,
    deliveryDate: Date,

    // Supplier details
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    supplierName: String,
    supplierEmail: String,
    supplierPhone: String,
    supplierGst: String,

    // Delivery address (warehouse)
    deliveryWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },

    // Line items
    items: [purchaseOrderItemSchema],

    // Financial details
    subtotal: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
    },
    shippingCharges: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
    },

    // Tax breakdown (GST)
    taxBreakdown: {
      cgst: { rate: Number, amount: Number },
      sgst: { rate: Number, amount: Number },
      igst: { rate: Number, amount: Number },
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'confirmed', 'partial', 'received', 'cancelled'],
      default: 'draft',
    },

    // Receipt tracking
    receiptStatus: {
      type: String,
      enum: ['pending', 'partial', 'complete'],
      default: 'pending',
    },
    receivedAt: Date,
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Stock tracking
    stockAdded: {
      type: Boolean,
      default: false,
    },
    stockAddedAt: Date,

    // Payment
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'cheque', 'upi', 'credit'],
    },
    paymentDueDate: Date,
    paymentDate: Date,
    paymentReference: String,
    paidAmount: {
      type: Number,
      default: 0,
    },

    // Additional
    termsAndConditions: String,
    notes: String,
    internalNotes: String,

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    confirmedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
purchaseOrderSchema.index({ poNumber: 1, tenant: 1 }, { unique: true });
purchaseOrderSchema.index({ supplier: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ createdAt: -1 });
purchaseOrderSchema.index({ poDate: -1 });

// Virtual for total items
purchaseOrderSchema.virtual('totalItems').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Virtual for total received items
purchaseOrderSchema.virtual('totalReceivedItems').get(function () {
  return this.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
});

// Virtual for pending items
purchaseOrderSchema.virtual('pendingItems').get(function () {
  return this.items.reduce(
    (sum, item) => sum + (item.quantity - (item.receivedQuantity || 0)),
    0
  );
});

// Pre-save hook to generate PO number
purchaseOrderSchema.pre('save', async function (next) {
  if (!this.poNumber) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Count POs this month for this tenant
    const count = await this.constructor.countDocuments({
      tenant: this.tenant,
      createdAt: {
        $gte: new Date(year, now.getMonth(), 1),
        $lt: new Date(year, now.getMonth() + 1, 1),
      },
    });

    this.poNumber = `PO/${year}-${month}/${String(count + 1).padStart(4, '0')}`;
  }

  // Calculate item totals
  this.items.forEach((item) => {
    item.taxableAmount = item.quantity * item.rate;
    item.taxAmount = (item.taxableAmount * item.taxRate) / 100;
    item.totalAmount = item.taxableAmount + item.taxAmount;
  });

  // Calculate totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.taxableAmount, 0);
  this.totalTax = this.items.reduce((sum, item) => sum + item.taxAmount, 0);

  // Apply discount
  if (this.discountType === 'percentage') {
    this.discountAmount = (this.subtotal * this.discountValue) / 100;
  } else {
    this.discountAmount = this.discountValue;
  }

  // Grand total
  this.grandTotal =
    this.subtotal - this.discountAmount + this.totalTax + (this.shippingCharges || 0);

  next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
