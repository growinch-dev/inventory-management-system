const mongoose = require('mongoose');

const salaryPaymentSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    // Payment date
    date: {
      type: Date,
      required: [true, 'Payment date is required'],
      default: Date.now,
    },
    employeeName: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
    },
    designation: { type: String, trim: true },
    // Salary period, e.g. "2026-11" or "November 2026"
    month: {
      type: String,
      required: [true, 'Salary month is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    mode: {
      type: String,
      enum: ['cash', 'bank_transfer', 'upi', 'cheque', 'card'],
      default: 'bank_transfer',
    },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 1000 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

salaryPaymentSchema.index({ tenant: 1, date: -1 });

module.exports = mongoose.model('SalaryPayment', salaryPaymentSchema);
