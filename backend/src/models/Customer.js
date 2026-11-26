const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  alternatePhone: String,
  gstNumber: {
    type: String,
    uppercase: true,
    trim: true,
  },
  panNumber: {
    type: String,
    uppercase: true,
    trim: true,
  },
  customerType: {
    type: String,
    enum: ['retailer', 'distributor', 'hotel_restaurant', 'corporate', 'government', 'event', 'individual'],
    default: 'retailer',
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
  creditLimit: {
    type: Number,
    default: 0,
  },
  outstandingBalance: {
    type: Number,
    default: 0,
  },
  // Referral — who brought / referred this customer
  referral: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    type: {
      type: String,
      enum: ['customer', 'employee', 'agent', 'other', ''],
      default: '',
    },
    notes: { type: String, trim: true },
  },
  notes: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Customer', customerSchema);
