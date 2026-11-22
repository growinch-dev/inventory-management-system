const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  paymentNumber: {
    type: String,
    required: true,
  },
  // Reference to the invoice or other document
  referenceType: {
    type: String,
    enum: ['invoice', 'purchase_order', 'tender', 'other'],
    required: true,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel',
  },
  referenceModel: {
    type: String,
    enum: ['Invoice', 'PurchaseOrder', 'Tender'],
  },
  referenceNumber: String,
  // Customer/Supplier info
  party: {
    type: {
      type: String,
      enum: ['customer', 'supplier'],
      required: true,
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'party.model',
    },
    model: {
      type: String,
      enum: ['Customer', 'Supplier'],
    },
    name: { type: String, required: true },
    email: String,
    phone: String,
  },
  // Payment details
  paymentType: {
    type: String,
    enum: ['received', 'made'],  // received from customer, made to supplier
    required: true,
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'upi', 'credit_card', 'debit_card', 'dd', 'neft', 'rtgs', 'imps', 'other'],
    required: true,
  },
  // Payment specific details
  bankDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    branchName: String,
  },
  chequeDetails: {
    chequeNumber: String,
    chequeDate: Date,
    bankName: String,
    branchName: String,
    status: {
      type: String,
      enum: ['pending', 'cleared', 'bounced'],
      default: 'pending',
    },
    clearedDate: Date,
    bouncedDate: Date,
    bounceReason: String,
  },
  upiDetails: {
    upiId: String,
    transactionId: String,
    app: String,  // Google Pay, PhonePe, etc.
  },
  transactionReference: String,
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'completed',
  },
  // For partial payments and tracking
  invoiceAmount: {
    type: Number,
    default: 0,
  },
  previouslyPaid: {
    type: Number,
    default: 0,
  },
  balanceAfterPayment: {
    type: Number,
    default: 0,
  },
  // TDS deduction (Tax Deducted at Source)
  tdsDeducted: {
    type: Boolean,
    default: false,
  },
  tdsAmount: {
    type: Number,
    default: 0,
  },
  tdsPercentage: {
    type: Number,
    default: 0,
  },
  // Notes and documents
  notes: String,
  internalNotes: String,
  attachments: [{
    name: String,
    url: String,
    type: String,
  }],
  // Receipt
  receiptGenerated: {
    type: Boolean,
    default: false,
  },
  receiptNumber: String,
  receiptUrl: String,
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
}, {
  timestamps: true,
});

// Generate payment number
paymentSchema.pre('save', async function() {
  if (!this.paymentNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const prefix = this.paymentType === 'received' ? 'RCP' : 'PAY';
    const count = await this.constructor.countDocuments({
      tenant: this.tenant,
      paymentType: this.paymentType,
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1),
      },
    });
    this.paymentNumber = `${prefix}/${year}-${month}/${String(count + 1).padStart(4, '0')}`;
  }
});

// Indexes
paymentSchema.index({ paymentNumber: 1, tenant: 1 }, { unique: true });
paymentSchema.index({ referenceType: 1, referenceId: 1 });
paymentSchema.index({ 'party.type': 1, 'party.id': 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
