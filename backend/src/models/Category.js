const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    value: {
      type: String,
      required: [true, 'Category value is required'],
      trim: true,
      lowercase: true,
    },
    type: {
      type: String,
      enum: ['finished_good', 'raw_material', 'work_in_progress', 'other'],
      default: 'other',
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
categorySchema.index({ tenant: 1, value: 1 }, { unique: true });
categorySchema.index({ tenant: 1, isActive: 1 });

module.exports = mongoose.model('Category', categorySchema);
