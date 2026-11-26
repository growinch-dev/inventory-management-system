const mongoose = require('mongoose');

const challanItemSchema = new mongoose.Schema({
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
  // For valuation purposes (not actual sale)
  rate: {
    type: Number,
    default: 0,
  },
  amount: {
    type: Number,
    default: 0,
  },
  serialNumbers: [String],
  batchNumber: String,
});

const deliveryChallanSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  challanNumber: {
    type: String,
    required: true,
  },
  challanDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  // Type of challan
  challanType: {
    type: String,
    enum: ['demo', 'approval', 'job_work', 'returnable', 'non_returnable', 'sample', 'credit'],
    required: true,
  },
  // Linked documents
  linkedDocument: {
    type: {
      type: String,
      enum: ['invoice', 'demo_issue', 'purchase_order', 'none'],
      default: 'none',
    },
    reference: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'linkedDocument.referenceModel',
    },
    referenceModel: {
      type: String,
      enum: ['Invoice', 'DemoIssue', 'PurchaseOrder'],
    },
    referenceNumber: String,
  },
  // Consignee details (where goods are sent)
  consignee: {
    name: { type: String, required: true },
    address: String,
    city: String,
    state: String,
    pincode: String,
    phone: String,
    gstNumber: String,
  },
  // Delivery address (if different from consignee)
  deliveryAddress: {
    name: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    contactPerson: String,
    phone: String,
  },
  // Items
  items: [challanItemSchema],
  // Totals (for valuation, not sale)
  totalQuantity: {
    type: Number,
    default: 0,
  },
  totalValue: {
    type: Number,
    default: 0,
  },
  // Transport details
  transportMode: {
    type: String,
    enum: ['road', 'rail', 'air', 'courier', 'hand_delivery', 'other'],
    default: 'road',
  },
  transportDetails: {
    vehicleNumber: String,
    vehicleType: String,
    driverName: String,
    driverPhone: String,
    transporterName: String,
    lrNumber: String,  // Lorry Receipt Number
    lrDate: Date,
    eWayBillNumber: String,
    eWayBillDate: Date,
  },
  // Dates
  dispatchDate: Date,
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date,
  expectedReturnDate: Date,  // For returnable challans
  actualReturnDate: Date,
  // Status tracking
  status: {
    type: String,
    enum: ['draft', 'dispatched', 'in_transit', 'delivered', 'partial_return', 'returned', 'converted', 'cancelled'],
    default: 'draft',
  },
  // Return tracking
  returnStatus: {
    type: String,
    enum: ['not_applicable', 'pending', 'partial', 'complete'],
    default: 'not_applicable',
  },
  returnedItems: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    quantityReturned: Number,
    returnDate: Date,
    condition: {
      type: String,
      enum: ['good', 'damaged', 'lost'],
      default: 'good',
    },
    notes: String,
  }],
  // Stock tracking
  stockDeducted: {
    type: Boolean,
    default: false,
  },
  stockDeductedAt: Date,
  stockRestored: {
    type: Boolean,
    default: false,
  },
  stockRestoredAt: Date,
  // Conversion to invoice
  convertedToInvoice: {
    type: Boolean,
    default: false,
  },
  invoiceReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
  },
  // Additional info
  purpose: String,
  termsAndConditions: {
    type: String,
    default: '1. Goods are sent on returnable basis.\n2. Any damage/loss will be charged.\n3. Subject to local jurisdiction.',
  },
  remarks: String,
  internalNotes: String,
  // Signatures
  preparedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  dispatchedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  receivedBy: String,
  receivedDate: Date,
  receiverSignature: String,  // Base64 or URL
  // Acknowledgment
  acknowledgmentReceived: {
    type: Boolean,
    default: false,
  },
  acknowledgmentDate: Date,
  acknowledgmentNotes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Generate challan number
deliveryChallanSchema.pre('validate', async function() {
  if (!this.challanNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Prefix based on type
    const prefixes = {
      demo: 'DC/DM',
      approval: 'DC/AP',
      job_work: 'DC/JW',
      returnable: 'DC/RT',
      non_returnable: 'DC/NR',
      sample: 'DC/SM',
      credit: 'DC/CR',
    };
    const prefix = prefixes[this.challanType] || 'DC';

    const count = await this.constructor.countDocuments({
      tenant: this.tenant,
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1),
      },
    });
    this.challanNumber = `${prefix}/${year}-${month}/${String(count + 1).padStart(4, '0')}`;
  }

  // Calculate totals
  this.totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.totalValue = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);

  // Set return status based on challan type
  if (['demo', 'approval', 'job_work', 'returnable'].includes(this.challanType)) {
    if (this.returnStatus === 'not_applicable') {
      this.returnStatus = 'pending';
    }
  }
});

// Virtual for days since dispatch
deliveryChallanSchema.virtual('daysSinceDispatch').get(function() {
  if (!this.dispatchDate) return null;
  const now = new Date();
  const dispatch = new Date(this.dispatchDate);
  return Math.floor((now - dispatch) / (1000 * 60 * 60 * 24));
});

// Virtual for overdue status (for returnable challans)
deliveryChallanSchema.virtual('isOverdue').get(function() {
  if (!this.expectedReturnDate || this.returnStatus === 'complete') return false;
  return new Date() > new Date(this.expectedReturnDate);
});

// Virtual for days until return
deliveryChallanSchema.virtual('daysUntilReturn').get(function() {
  if (!this.expectedReturnDate) return null;
  const now = new Date();
  const returnDate = new Date(this.expectedReturnDate);
  return Math.ceil((returnDate - now) / (1000 * 60 * 60 * 24));
});

// Virtual for total returned quantity
deliveryChallanSchema.virtual('totalReturned').get(function() {
  return this.returnedItems.reduce((sum, item) => sum + (item.quantityReturned || 0), 0);
});

// Virtual for pending return quantity
deliveryChallanSchema.virtual('pendingReturn').get(function() {
  return this.totalQuantity - this.totalReturned;
});

// Ensure virtuals are included
deliveryChallanSchema.set('toJSON', { virtuals: true });
deliveryChallanSchema.set('toObject', { virtuals: true });

// Indexes
deliveryChallanSchema.index({ challanNumber: 1, tenant: 1 }, { unique: true });
deliveryChallanSchema.index({ challanDate: -1 });
deliveryChallanSchema.index({ challanType: 1, status: 1 });
deliveryChallanSchema.index({ 'consignee.name': 1 });
deliveryChallanSchema.index({ status: 1 });
deliveryChallanSchema.index({ expectedReturnDate: 1, returnStatus: 1 });

module.exports = mongoose.model('DeliveryChallan', deliveryChallanSchema);
