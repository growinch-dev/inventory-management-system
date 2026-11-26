const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },

  // Expense Details
  expenseNumber: {
    type: String,
    required: true,
  },
  expenseDate: {
    type: Date,
    required: [true, 'Expense date is required'],
    default: Date.now,
  },

  // Category
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'salary',           // Salaries and wages
      'electricity',      // Electricity bills
      'rent',            // Factory/office rent
      'maintenance',     // Equipment maintenance
      'transport',       // Transport and fuel
      'packaging',       // Packaging materials
      'marketing',       // Marketing and advertising
      'office',          // Office supplies and expenses
      'communication',   // Phone, internet bills
      'insurance',       // Insurance premiums
      'taxes',           // Taxes and fees
      'professional',    // Professional fees (legal, accounting)
      'depreciation',    // Equipment depreciation
      'misc',            // Miscellaneous expenses
    ],
  },

  // Description
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },

  // Amount
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
  },

  // Tax Information
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative'],
  },
  taxRate: {
    type: Number,
    default: 0,
    min: [0, 'Tax rate cannot be negative'],
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative'],
  },

  // Vendor/Payee
  vendor: {
    type: String,
    required: [true, 'Vendor/Payee name is required'],
    trim: true,
  },
  vendorRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',  // Can reference supplier if vendor is in system
  },

  // Payment Information
  paymentMode: {
    type: String,
    required: [true, 'Payment mode is required'],
    enum: ['cash', 'bank_transfer', 'online', 'cheque', 'upi', 'card', 'petty_cash'],
    default: 'cash',
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'partially_paid', 'cancelled'],
    default: 'paid',
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative'],
  },
  pendingAmount: {
    type: Number,
    default: 0,
    min: [0, 'Pending amount cannot be negative'],
  },
  paymentDate: {
    type: Date,
  },
  paymentReference: {
    type: String,
    trim: true,
  },

  // Bank Details (for bank transfers/cheques)
  bankDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    chequeNumber: String,
    transactionId: String,
  },

  // Bill/Receipt Information
  billNumber: {
    type: String,
    trim: true,
  },
  billDate: {
    type: Date,
  },
  receiptNumber: {
    type: String,
    trim: true,
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: { type: Date, default: Date.now },
  }],

  // Categorization
  department: {
    type: String,
    enum: ['production', 'administration', 'sales', 'distribution', 'general'],
    default: 'general',
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurringFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
  },
  nextRecurringDate: {
    type: Date,
  },

  // Approval Workflow
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
  rejectionReason: {
    type: String,
    trim: true,
  },

  // Additional Details
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
  tags: [{
    type: String,
    trim: true,
  }],

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },

  // Created/Modified by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Compound unique index for expense number within tenant
expenseSchema.index({ expenseNumber: 1, tenant: 1 }, { unique: true });

// Indexes for queries
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ paymentStatus: 1 });
expenseSchema.index({ approvalStatus: 1 });
expenseSchema.index({ vendor: 'text', description: 'text' });

// Pre-save middleware to auto-generate expense number
expenseSchema.pre('validate', async function () {
  if (!this.expenseNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Find the last expense number for this month
    const lastExpense = await this.constructor
      .findOne({
        tenant: this.tenant,
        expenseNumber: new RegExp(`^EXP-${year}${month}`)
      })
      .sort({ expenseNumber: -1 });

    let sequence = 1;
    if (lastExpense && lastExpense.expenseNumber) {
      const lastSequence = parseInt(lastExpense.expenseNumber.split('-').pop());
      sequence = lastSequence + 1;
    }

    this.expenseNumber = `EXP-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  // Calculate total amount with tax
  if (this.isModified('amount') || this.isModified('taxRate') || this.isModified('taxAmount')) {
    if (this.taxRate > 0 && this.taxAmount === 0) {
      this.taxAmount = (this.amount * this.taxRate) / 100;
    }
    this.totalAmount = this.amount + this.taxAmount;
  }

  // Calculate pending amount
  if (this.isModified('totalAmount') || this.isModified('paidAmount')) {
    this.pendingAmount = this.totalAmount - this.paidAmount;

    // Update payment status based on amounts
    if (this.paidAmount === 0) {
      this.paymentStatus = 'pending';
    } else if (this.paidAmount >= this.totalAmount) {
      this.paymentStatus = 'paid';
      this.paidAmount = this.totalAmount;  // Cap at total amount
      this.pendingAmount = 0;
    } else {
      this.paymentStatus = 'partially_paid';
    }
  }

});

// Method to mark as paid
expenseSchema.methods.markAsPaid = async function(paymentDetails = {}) {
  this.paymentStatus = 'paid';
  this.paidAmount = this.totalAmount;
  this.pendingAmount = 0;
  this.paymentDate = paymentDetails.paymentDate || new Date();
  this.paymentReference = paymentDetails.paymentReference || '';

  if (paymentDetails.paymentMode) {
    this.paymentMode = paymentDetails.paymentMode;
  }

  if (paymentDetails.bankDetails) {
    this.bankDetails = paymentDetails.bankDetails;
  }

  return await this.save();
};

// Method to record partial payment
expenseSchema.methods.recordPartialPayment = async function(amount, paymentDetails = {}) {
  if (amount <= 0 || amount > this.pendingAmount) {
    throw new Error('Invalid payment amount');
  }

  this.paidAmount += amount;
  this.pendingAmount = this.totalAmount - this.paidAmount;

  if (this.pendingAmount <= 0) {
    this.paymentStatus = 'paid';
    this.pendingAmount = 0;
  } else {
    this.paymentStatus = 'partially_paid';
  }

  if (paymentDetails.paymentDate) {
    this.paymentDate = paymentDetails.paymentDate;
  }

  if (paymentDetails.paymentReference) {
    this.paymentReference = paymentDetails.paymentReference;
  }

  return await this.save();
};

// Method to approve expense
expenseSchema.methods.approve = async function(userId) {
  this.approvalStatus = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return await this.save();
};

// Method to reject expense
expenseSchema.methods.reject = async function(userId, reason) {
  this.approvalStatus = 'rejected';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.rejectionReason = reason;
  return await this.save();
};

// Static method to get expenses by date range
expenseSchema.statics.getExpensesByDateRange = function(tenantId, startDate, endDate) {
  return this.find({
    tenant: tenantId,
    expenseDate: {
      $gte: startDate,
      $lte: endDate
    },
    isActive: true
  }).populate('createdBy', 'name email');
};

// Static method to get expenses by category
expenseSchema.statics.getExpensesByCategory = function(tenantId, category) {
  return this.find({
    tenant: tenantId,
    category: category,
    isActive: true
  }).sort({ expenseDate: -1 });
};

// Static method to get total expenses for a period
expenseSchema.statics.getTotalExpenses = async function(tenantId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        tenant: mongoose.Types.ObjectId(tenantId),
        expenseDate: { $gte: startDate, $lte: endDate },
        isActive: true,
        paymentStatus: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$totalAmount' },
        paidAmount: { $sum: '$paidAmount' },
        pendingAmount: { $sum: '$pendingAmount' },
        count: { $sum: 1 }
      }
    }
  ]);

  return result[0] || { totalAmount: 0, paidAmount: 0, pendingAmount: 0, count: 0 };
};

// Static method to get expenses by category for a period
expenseSchema.statics.getCategorywiseExpenses = async function(tenantId, startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        tenant: mongoose.Types.ObjectId(tenantId),
        expenseDate: { $gte: startDate, $lte: endDate },
        isActive: true,
        paymentStatus: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$totalAmount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
};

module.exports = mongoose.model('Expense', expenseSchema);
