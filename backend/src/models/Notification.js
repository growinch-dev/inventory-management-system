const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Multi-tenancy
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'low_stock',
        'out_of_stock',
        'expiry_alert',
        'expired',
        'po_received',
        'transfer_completed',
        'invoice_overdue',
        'demo_return',
        'tender_deadline',
        'tender_emd',
        'payment_reminder',
        'system',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    // Reference to related entity
    referenceType: {
      type: String,
      enum: ['product', 'batch', 'purchase_order', 'invoice', 'transfer', 'demo_issue', 'tender', 'delivery_challan', null],
    },
    referenceLink: {
      type: String,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    // Additional data
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    // Email tracking
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
    },
    // Expiry for auto-cleanup
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Static method to create low stock notification
notificationSchema.statics.createLowStockAlert = async function (product, users) {
  const notifications = users.map((userId) => ({
    user: userId,
    type: 'low_stock',
    title: 'Low Stock Alert',
    message: `${product.name} (SKU: ${product.sku}) is running low. Current stock: ${product.quantity}, Reorder level: ${product.reorderLevel}`,
    priority: product.quantity === 0 ? 'critical' : 'high',
    referenceType: 'product',
    referenceId: product._id,
    metadata: {
      productName: product.name,
      sku: product.sku,
      currentStock: product.quantity,
      reorderLevel: product.reorderLevel,
    },
  }));

  return await this.insertMany(notifications);
};

// Static method to create expiry alert notification
notificationSchema.statics.createExpiryAlert = async function (batch, users, daysUntilExpiry) {
  const priority = daysUntilExpiry <= 0 ? 'critical' : daysUntilExpiry <= 7 ? 'high' : 'medium';
  const type = daysUntilExpiry <= 0 ? 'expired' : 'expiry_alert';
  const title = daysUntilExpiry <= 0 ? 'Product Expired' : 'Expiry Alert';

  const notifications = users.map((userId) => ({
    user: userId,
    type,
    title,
    message:
      daysUntilExpiry <= 0
        ? `Batch ${batch.batchNumber} of ${batch.productName} has expired!`
        : `Batch ${batch.batchNumber} of ${batch.productName} expires in ${daysUntilExpiry} days`,
    priority,
    referenceType: 'batch',
    referenceId: batch._id,
    metadata: {
      batchNumber: batch.batchNumber,
      productName: batch.productName,
      expiryDate: batch.expiryDate,
      daysUntilExpiry,
      quantity: batch.currentQuantity,
    },
  }));

  return await this.insertMany(notifications);
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function () {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function (userId, tenantId) {
  const query = { user: userId, read: false };
  if (tenantId) query.tenant = tenantId;
  return this.countDocuments(query);
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function (userId, tenantId) {
  const query = { user: userId, read: false };
  if (tenantId) query.tenant = tenantId;
  return this.updateMany(query, { read: true, readAt: new Date() });
};

module.exports = mongoose.model('Notification', notificationSchema);
