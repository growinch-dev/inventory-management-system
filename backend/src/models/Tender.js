const mongoose = require('mongoose');

const tenderSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  tenderNumber: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Tender title is required'],
    trim: true,
    maxlength: [500, 'Title cannot exceed 500 characters'],
  },
  description: {
    type: String,
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },
  // Organization/Customer details
  organization: {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['government', 'semi_government', 'private', 'hospital', 'other'],
      default: 'government'
    },
    address: { type: String },
    contactPerson: { type: String },
    contactPhone: { type: String },
    contactEmail: { type: String },
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  // Tender dates
  publishDate: {
    type: Date,
  },
  submissionDeadline: {
    type: Date,
    required: [true, 'Submission deadline is required'],
  },
  openingDate: {
    type: Date,
  },
  validityPeriod: {
    type: Number, // in days
    default: 90,
  },
  // Financial details
  estimatedValue: {
    type: Number,
    min: [0, 'Estimated value cannot be negative'],
  },
  quotedValue: {
    type: Number,
    min: [0, 'Quoted value cannot be negative'],
  },
  finalValue: {
    type: Number,
    min: [0, 'Final value cannot be negative'],
  },
  // EMD (Earnest Money Deposit)
  emd: {
    required: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ['cash', 'bank_guarantee', 'dd', 'online', 'exempted'],
      default: 'dd'
    },
    bankName: { type: String },
    instrumentNumber: { type: String }, // DD/BG number
    instrumentDate: { type: Date },
    validUntil: { type: Date },
    submittedDate: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'refunded', 'forfeited', 'exempted'],
      default: 'pending'
    },
    refundDate: { type: Date },
    refundReference: { type: String },
    notes: { type: String },
  },
  // Security Deposit / Performance Guarantee
  securityDeposit: {
    required: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },
    percentage: { type: Number }, // percentage of contract value
    type: {
      type: String,
      enum: ['cash', 'bank_guarantee', 'dd', 'online', 'retention'],
      default: 'bank_guarantee'
    },
    bankName: { type: String },
    instrumentNumber: { type: String },
    instrumentDate: { type: Date },
    validUntil: { type: Date },
    submittedDate: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'partial_refund', 'refunded', 'forfeited'],
      default: 'pending'
    },
    refundDate: { type: Date },
    refundReference: { type: String },
    notes: { type: String },
  },
  // Tender items/products
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    description: { type: String },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number },
    totalPrice: { type: Number },
    deliveredQuantity: { type: Number, default: 0 },
    pendingQuantity: { type: Number },
    deliverySchedule: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'partial', 'completed'],
      default: 'pending'
    },
  }],
  // Status and workflow
  status: {
    type: String,
    enum: [
      'draft',
      'submitted',
      'technical_evaluation',
      'financial_evaluation',
      'awarded',
      'loa_received', // Letter of Acceptance
      'po_received',  // Purchase Order received
      'in_progress',
      'completed',
      'cancelled',
      'lost'
    ],
    default: 'draft',
  },
  // Approval workflow
  approvals: [{
    stage: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    remarks: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
  }],
  // Related documents
  documents: [{
    name: { type: String },
    type: {
      type: String,
      enum: ['tender_document', 'technical_bid', 'financial_bid', 'emd_receipt',
             'sd_receipt', 'loa', 'po', 'contract', 'invoice', 'other']
    },
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  // Supply tracking
  supplyOrders: [{
    invoiceNumber: { type: String },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    deliveryDate: { type: Date },
    items: [{
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantity: { type: Number },
    }],
    status: {
      type: String,
      enum: ['pending', 'dispatched', 'delivered', 'acknowledged'],
      default: 'pending'
    },
    challanNumber: { type: String },
    remarks: { type: String },
  }],
  // Payment tracking
  payments: [{
    invoiceNumber: { type: String },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    amount: { type: Number },
    receivedDate: { type: Date },
    paymentMethod: { type: String },
    referenceNumber: { type: String },
    remarks: { type: String },
  }],
  // Important dates and reminders
  reminders: [{
    type: {
      type: String,
      enum: ['submission', 'emd_expiry', 'sd_expiry', 'delivery', 'payment', 'other']
    },
    date: { type: Date },
    message: { type: String },
    sent: { type: Boolean, default: false },
    sentAt: { type: Date },
  }],
  // Audit fields
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  category: {
    type: String,
    enum: ['medical_equipment', 'surgical_instruments', 'hospital_furniture',
           'consumables', 'maintenance', 'other'],
    default: 'medical_equipment',
  },
  source: {
    type: String, // gem, cppp, state_portal, direct
    trim: true,
  },
  referenceNumber: {
    type: String, // External tender reference
    trim: true,
  },
  notes: {
    type: String,
  },
  // User tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
tenderSchema.index({ tenderNumber: 1, tenant: 1 }, { unique: true });
tenderSchema.index({ status: 1 });
tenderSchema.index({ submissionDeadline: 1 });
tenderSchema.index({ 'organization.name': 'text', title: 'text' });

// Virtual for total pending supply value
tenderSchema.virtual('pendingSupplyValue').get(function() {
  if (!this.items || this.items.length === 0) return 0;
  return this.items.reduce((total, item) => {
    const pending = (item.quantity || 0) - (item.deliveredQuantity || 0);
    return total + (pending * (item.unitPrice || 0));
  }, 0);
});

// Virtual for total delivered value
tenderSchema.virtual('deliveredValue').get(function() {
  if (!this.items || this.items.length === 0) return 0;
  return this.items.reduce((total, item) => {
    return total + ((item.deliveredQuantity || 0) * (item.unitPrice || 0));
  }, 0);
});

// Virtual for supply completion percentage
tenderSchema.virtual('supplyProgress').get(function() {
  if (!this.items || this.items.length === 0) return 0;
  const totalQty = this.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const deliveredQty = this.items.reduce((sum, item) => sum + (item.deliveredQuantity || 0), 0);
  if (totalQty === 0) return 0;
  return Math.round((deliveredQty / totalQty) * 100);
});

// Pre-save to generate tender number
tenderSchema.pre('validate', async function () {
  if (!this.tenderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await this.constructor.countDocuments({
      tenant: this.tenant,
      createdAt: {
        $gte: new Date(year, date.getMonth(), 1),
        $lt: new Date(year, date.getMonth() + 1, 1)
      }
    });
    this.tenderNumber = `TND/${year}-${month}/${String(count + 1).padStart(4, '0')}`;
  }

  // Update item pending quantities
  if (this.items) {
    this.items.forEach(item => {
      item.pendingQuantity = (item.quantity || 0) - (item.deliveredQuantity || 0);
      if (item.pendingQuantity <= 0) {
        item.status = 'completed';
      } else if (item.deliveredQuantity > 0) {
        item.status = 'partial';
      }
    });
  }

});

module.exports = mongoose.model('Tender', tenderSchema);
