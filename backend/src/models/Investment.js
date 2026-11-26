const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    investorName: {
      type: String,
      required: [true, 'Investor name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['capital', 'owner_contribution', 'loan', 'other'],
      default: 'capital',
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

investmentSchema.index({ tenant: 1, date: -1 });

module.exports = mongoose.model('Investment', investmentSchema);
