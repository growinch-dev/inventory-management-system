const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['in', 'out', 'adjustment', 'transfer'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  previousQuantity: {
    type: Number,
    required: true,
  },
  newQuantity: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    enum: ['purchase', 'sale', 'return', 'damage', 'expired', 'adjustment', 'transfer', 'initial', 'demo', 'production'],
    required: true,
  },
  reference: {
    type: String, // Invoice number, PO number, Transfer number, etc.
  },
  referenceType: {
    type: String,
    enum: ['invoice', 'purchase_order', 'transfer', 'manual', 'qr_scan', 'delivery_challan', 'demo_issue', 'batch', 'production'],
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel',
  },
  referenceModel: {
    type: String,
    enum: ['Invoice', 'Transfer', 'PurchaseOrder', 'DeliveryChallan', 'DemoIssue', 'Batch', 'Production'],
  },
  warehouse: {
    type: String,
  },
  warehouseRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
  },
  fromWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
  },
  fromWarehouseName: String,
  toWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
  },
  toWarehouseName: String,
  notes: String,
  scannedVia: {
    type: String,
    enum: ['qr', 'barcode', 'manual'],
    default: 'manual',
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ performedBy: 1, createdAt: -1 });
stockMovementSchema.index({ warehouse: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });
stockMovementSchema.index({ reason: 1, createdAt: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
