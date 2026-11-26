const User = require('../models/User');
const Role = require('../models/Role');
const { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, defaultPermissionsForRole } = require('../config/rolePermissions');

// Resolve a role's module access: the tenant's Role doc if it exists, else the built-in defaults.
const permissionsForRole = async (tenant, role) => {
  const roleDoc = await Role.findOne({ tenant, key: role });
  return roleDoc ? roleDoc.permissions : defaultPermissionsForRole(role);
};

// Get role-based default module access (for the UI to prefill)
// @route   GET /api/users/role-permissions
exports.getRolePermissions = async (req, res) => {
  res.status(200).json({
    success: true,
    data: { all: ALL_PERMISSIONS, defaults: DEFAULT_ROLE_PERMISSIONS },
  });
};

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ tenant: req.user.tenant })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message,
    });
  }
};

// Get single user
exports.getUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message,
    });
  }
};

// Create user
exports.createUser = async (req, res) => {
  try {
    // Only admin and super_admin can create users
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create users',
      });
    }

    const userData = {
      ...req.body,
      tenant: req.user.tenant,
      invitedBy: req.user.id,
    };

    // Apply the role's module access when none was explicitly chosen.
    if (!Array.isArray(userData.permissions) || userData.permissions.length === 0) {
      userData.permissions = await permissionsForRole(req.user.tenant, userData.role);
    }

    // Prevent non-super_admin from creating super_admin
    if (userData.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create super admin users',
      });
    }

    const user = await User.create(userData);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message,
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Only admin can update users (or users can update themselves)
    if (!['admin', 'super_admin'].includes(req.user.role) && req.user.id !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user',
      });
    }

    // Prevent updating password through this endpoint
    if (req.body.password) {
      delete req.body.password;
    }

    // Prevent changing owner status
    if (req.body.isOwner !== undefined) {
      delete req.body.isOwner;
    }

    // Prevent non-super_admin from setting super_admin role
    if (req.body.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to set super admin role',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message,
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Only admin can delete users
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete users',
      });
    }

    // Prevent deleting owner
    if (user.isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete owner account',
      });
    }

    // Prevent deleting yourself
    if (req.user.id === user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete your own account',
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message,
    });
  }
};

// Update user permissions
exports.updatePermissions = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Only admin can update permissions
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update permissions',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { permissions: req.body.permissions },
      {
        new: true,
        runValidators: true,
      }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Permissions updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating permissions',
      error: error.message,
    });
  }
};
