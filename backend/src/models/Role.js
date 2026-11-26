const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      maxlength: [50, 'Role name cannot exceed 50 characters'],
    },
    // Slug stored on User.role (e.g. "admin", "accountant").
    key: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    // Module keys this role can access (from config/rolePermissions ALL_PERMISSIONS).
    permissions: {
      type: [String],
      default: [],
    },
    // System roles (admin/manager/staff) can be edited but not deleted or renamed-key.
    isSystem: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

roleSchema.index({ tenant: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);
