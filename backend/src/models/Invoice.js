const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
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
  taxableAmount: {
    type: Number,
    required: true,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
});

const invoiceSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
  },
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  dueDate: {
    type: Date,
  },
  customer: {
    name: { type: String, required: true },
    email: String,
    phone: String,
    gstNumber: String,
    panNumber: String,
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: true,
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
    min: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  taxBreakdown: {
    cgst: { rate: Number, amount: Number },
    sgst: { rate: Number, amount: Number },
    igst: { rate: Number, amount: Number },
  },
  totalTax: {
    type: Number,
    default: 0,
  },
  shippingCharges: {
    type: Number,
    default: 0,
    min: 0,
  },
  grandTotal: {
    type: Number,
    required: true,
  },
  amountInWords: {
    type: String,
  },
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'dispatched', 'delivered', 'paid', 'overdue', 'cancelled'],
    default: 'draft',
  },
  // Dispatch tracking
  dispatchStatus: {
    type: String,
    enum: ['pending', 'picking', 'packed', 'dispatched', 'delivered'],
    default: 'pending',
  },
  dispatchedAt: Date,
  dispatchedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  deliveredAt: Date,
  deliveredBy: {
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
  stockDeducted: {
    type: Boolean,
    default: false,
  },
  stockDeductedAt: Date,
  // Payment info
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'upi', 'credit'],
  },
  paymentDate: Date,
  paymentReference: String,
  termsAndConditions: {
    type: String,
    default: '1. Goods once sold will not be taken back.\n2. Subject to Delhi jurisdiction.\n3. E. & O.E.',
  },
  notes: String,
  linkedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Compound index for unique invoice number per tenant
invoiceSchema.index({ invoiceNumber: 1, tenant: 1 }, { unique: true });

// Generate invoice number
invoiceSchema.pre('validate', async function() {
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.constructor.countDocuments({
      tenant: this.tenant,
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1),
      },
    });
    this.invoiceNumber = `MSC/${year}-${month}/${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
