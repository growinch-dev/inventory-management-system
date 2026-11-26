const mongoose = require('mongoose');

const demoIssueSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  issueNumber: {
    type: String,
    required: true,
  },
  // Customer/Hospital details
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  hospital: {
    name: { type: String, required: true },
    department: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
  },
  contactPerson: {
    name: { type: String },
    phone: { type: String },
    email: { type: String },
    designation: { type: String },
  },
  // Issue details
  issueDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  expectedReturnDate: {
    type: Date,
    required: true,
  },
  actualReturnDate: {
    type: Date,
  },
  // Items issued
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    serialNumbers: [{ type: String }],
    returnedQuantity: {
      type: Number,
      default: 0,
    },
    returnedSerialNumbers: [{ type: String }],
    condition: {
      type: String,
      enum: ['good', 'damaged', 'lost', 'partial_damage'],
      default: 'good',
    },
    conditionNotes: { type: String },
    returnDate: { type: Date },
    status: {
      type: String,
      enum: ['issued', 'partial_return', 'returned', 'damaged', 'lost'],
      default: 'issued',
    },
  }],
  // Purpose and details
  purpose: {
    type: String,
    enum: ['demo', 'trial', 'evaluation', 'training', 'exhibition', 'loan', 'other'],
    default: 'demo',
  },
  purposeDescription: {
    type: String,
  },
  // Related documents
  challanNumber: {
    type: String,
  },
  relatedTender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tender',
  },
  // Status
  status: {
    type: String,
    enum: ['draft', 'issued', 'partial_return', 'returned', 'overdue', 'cancelled'],
    default: 'draft',
  },
  // Reminders
  reminders: [{
    reminderDate: { type: Date },
    type: {
      type: String,
      enum: ['upcoming_return', 'overdue', 'follow_up']
    },
    message: { type: String },
    sent: { type: Boolean, default: false },
    sentAt: { type: Date },
    sentVia: {
      type: String,
      enum: ['email', 'sms', 'in_app'],
    },
  }],
  // Financial
  securityDeposit: {
    amount: { type: Number, default: 0 },
    received: { type: Boolean, default: false },
    receivedDate: { type: Date },
    refunded: { type: Boolean, default: false },
    refundedDate: { type: Date },
    paymentMethod: { type: String },
    referenceNumber: { type: String },
  },
  // Tracking
  dispatchInfo: {
    dispatchDate: { type: Date },
    dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    carrier: { type: String },
    trackingNumber: { type: String },
    vehicleNumber: { type: String },
    driverName: { type: String },
    driverPhone: { type: String },
  },
  returnInfo: {
    receivedDate: { type: Date },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    carrier: { type: String },
    trackingNumber: { type: String },
    overallCondition: {
      type: String,
      enum: ['good', 'acceptable', 'damaged', 'missing_items'],
    },
    notes: { type: String },
  },
  // Follow-up
  followUpRequired: {
    type: Boolean,
    default: true,
  },
  followUpDate: {
    type: Date,
  },
  followUpNotes: {
    type: String,
  },
  conversionStatus: {
    type: String,
    enum: ['pending', 'interested', 'negotiating', 'converted', 'lost', 'not_interested'],
    default: 'pending',
  },
  // Notes
  internalNotes: {
    type: String,
  },
  customerFeedback: {
    type: String,
  },
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
demoIssueSchema.index({ issueNumber: 1, tenant: 1 }, { unique: true });
demoIssueSchema.index({ status: 1 });
demoIssueSchema.index({ expectedReturnDate: 1 });
demoIssueSchema.index({ 'hospital.name': 'text' });

// Virtual for days until return
demoIssueSchema.virtual('daysUntilReturn').get(function() {
  if (!this.expectedReturnDate || this.status === 'returned') return null;
  const now = new Date();
  const expected = new Date(this.expectedReturnDate);
  const diffTime = expected - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for overdue status
demoIssueSchema.virtual('isOverdue').get(function() {
  if (this.status === 'returned' || this.status === 'cancelled') return false;
  return new Date() > new Date(this.expectedReturnDate);
});

// Virtual for total items
demoIssueSchema.virtual('totalItems').get(function() {
  if (!this.items) return 0;
  return (this.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
});

// Virtual for total returned items
demoIssueSchema.virtual('totalReturned').get(function() {
  if (!this.items) return 0;
  return (this.items || []).reduce((sum, item) => sum + (item.returnedQuantity || 0), 0);
});

// Virtual for pending items
demoIssueSchema.virtual('totalPending').get(function() {
  return this.totalItems - this.totalReturned;
});

// Pre-save to generate issue number and update status
demoIssueSchema.pre('validate', async function () {
  // Generate issue number
  if (!this.issueNumber) {
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
    this.issueNumber = `DEMO/${year}-${month}/${String(count + 1).padStart(4, '0')}`;
  }

  // Update item statuses
  if (this.items) {
    this.items.forEach(item => {
      if (item.returnedQuantity >= item.quantity) {
        item.status = 'returned';
      } else if (item.returnedQuantity > 0) {
        item.status = 'partial_return';
      }
    });
  }

  // Update overall status based on items
  if (this.items && this.items.length > 0 && this.status !== 'draft' && this.status !== 'cancelled') {
    const allReturned = this.items.every(item => item.returnedQuantity >= item.quantity);
    const someReturned = this.items.some(item => item.returnedQuantity > 0);

    if (allReturned) {
      this.status = 'returned';
      if (!this.actualReturnDate) {
        this.actualReturnDate = new Date();
      }
    } else if (someReturned) {
      this.status = 'partial_return';
    }

    // Check for overdue
    if (this.status !== 'returned' && new Date() > new Date(this.expectedReturnDate)) {
      this.status = 'overdue';
    }
  }

  // Create reminders for upcoming return
  if (this.isNew && this.expectedReturnDate) {
    const returnDate = new Date(this.expectedReturnDate);

    // 7 days before
    const reminder7 = new Date(returnDate);
    reminder7.setDate(reminder7.getDate() - 7);
    if (reminder7 > new Date()) {
      this.reminders.push({
        reminderDate: reminder7,
        type: 'upcoming_return',
        message: `Demo instruments due for return in 7 days`,
      });
    }

    // 3 days before
    const reminder3 = new Date(returnDate);
    reminder3.setDate(reminder3.getDate() - 3);
    if (reminder3 > new Date()) {
      this.reminders.push({
        reminderDate: reminder3,
        type: 'upcoming_return',
        message: `Demo instruments due for return in 3 days`,
      });
    }

    // 1 day before
    const reminder1 = new Date(returnDate);
    reminder1.setDate(reminder1.getDate() - 1);
    if (reminder1 > new Date()) {
      this.reminders.push({
        reminderDate: reminder1,
        type: 'upcoming_return',
        message: `Demo instruments due for return tomorrow`,
      });
    }
  }

});

module.exports = mongoose.model('DemoIssue', demoIssueSchema);
