const mongoose = require('mongoose');

const qrScanSchema = new mongoose.Schema({
  // Multi-tenancy
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  action: {
    type: String,
    enum: ['view', 'stock_in', 'stock_out', 'add_to_invoice', 'verify', 'location_update'],
    required: true,
  },
  quantity: {
    type: Number,
    default: 0,
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
  },
  location: {
    latitude: Number,
    longitude: Number,
  },
  device: {
    type: String, // Browser/device info
  },
  ipAddress: String,
  scannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  notes: String,
}, {
  timestamps: true,
});

// Index for analytics
qrScanSchema.index({ product: 1, createdAt: -1 });
qrScanSchema.index({ scannedBy: 1, createdAt: -1 });
qrScanSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('QRScan', qrScanSchema);
