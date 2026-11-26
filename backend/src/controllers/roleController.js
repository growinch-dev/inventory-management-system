const Role = require('../models/Role');
const User = require('../models/User');
const { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } = require('../config/rolePermissions');

const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Create the built-in roles for a tenant if they don't exist yet.
const ensureSystemRoles = async (tenant) => {
  const system = [
    { key: 'admin', name: 'Admin', description: 'Full access to all modules' },
    { key: 'manager', name: 'Manager', description: 'Operations and accounts' },
    { key: 'staff', name: 'Staff', description: 'Day-to-day data entry' },
  ];
  for (const r of system) {
    const existing = await Role.findOne({ tenant, key: r.key });
    if (!existing) {
      await Role.create({
        tenant,
        key: r.key,
        name: r.name,
        description: r.description,
        permissions: DEFAULT_ROLE_PERMISSIONS[r.key] || [],
        isSystem: true,
      });
    }
  }
};

// @desc    List roles for the tenant (+ the full module list for the UI)
// @route   GET /api/roles
exports.getRoles = async (req, res, next) => {
  try {
    await ensureSystemRoles(req.user.tenant);
    const roles = await Role.find({ tenant: req.user.tenant }).sort({ isSystem: -1, name: 1 });
    res.status(200).json({
      success: true,
      data: roles,
      modules: ALL_PERMISSIONS,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a custom role
// @route   POST /api/roles
exports.createRole = async (req, res, next) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }
    const key = slugify(name);
    if (!key) {
      return res.status(400).json({ success: false, message: 'Invalid role name' });
    }
    if (['super_admin', 'owner'].includes(key)) {
      return res.status(400).json({ success: false, message: 'That role name is reserved' });
    }
    const exists = await Role.findOne({ tenant: req.user.tenant, key });
    if (exists) {
      return res.status(400).json({ success: false, message: 'A role with this name already exists' });
    }
    const role = await Role.create({
      tenant: req.user.tenant,
      key,
      name: name.trim(),
      description,
      permissions: Array.isArray(permissions) ? permissions.filter((p) => ALL_PERMISSIONS.includes(p)) : [],
      isSystem: false,
    });
    res.status(201).json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a role's name/description/permissions (and sync its users)
// @route   PUT /api/roles/:id
exports.updateRole = async (req, res, next) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, tenant: req.user.tenant });
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const { name, description, permissions, isActive } = req.body;

    // System roles keep their key; custom roles may be renamed.
    if (name !== undefined && !role.isSystem) role.name = name.trim();
    if (description !== undefined) role.description = description;
    if (isActive !== undefined) role.isActive = isActive;
    if (Array.isArray(permissions)) {
      role.permissions = permissions.filter((p) => ALL_PERMISSIONS.includes(p));
    }
    await role.save();

    // Keep users of this role in sync so menu access reflects the change.
    await User.updateMany(
      { tenant: req.user.tenant, role: role.key },
      { $set: { permissions: role.permissions } }
    );

    res.status(200).json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a custom role (reassigns its users to Staff)
// @route   DELETE /api/roles/:id
exports.deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, tenant: req.user.tenant });
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    if (role.isSystem) {
      return res.status(400).json({ success: false, message: 'Built-in roles cannot be deleted' });
    }

    // Move any users on this role down to Staff.
    const staff = await Role.findOne({ tenant: req.user.tenant, key: 'staff' });
    await User.updateMany(
      { tenant: req.user.tenant, role: role.key },
      { $set: { role: 'staff', permissions: staff?.permissions || [] } }
    );

    await role.deleteOne();
    res.status(200).json({ success: true, message: 'Role deleted; its users moved to Staff' });
  } catch (error) {
    next(error);
  }
};
