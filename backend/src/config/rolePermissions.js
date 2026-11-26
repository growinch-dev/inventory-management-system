/**
 * Canonical module list and per-role default module access.
 * Permission keys match the menu keys used in the frontend sidebar
 * (DashboardLayout permissionMap).
 */
const ALL_PERMISSIONS = [
  'dashboard',
  'products',
  'raw-materials',
  'categories',
  'customers',
  'vendors',
  'warehouses',
  'purchase-orders',
  'production',
  'invoices',
  'delivery-challans',
  'pos',
  'movements',
  'transfers',
  'labels',
  'expenses',
  'payments',
  'receipts',
  'investments',
  'salaries',
  'reports',
  'settings',
  'users',
];

// What each role can access by default.
const DEFAULT_ROLE_PERMISSIONS = {
  super_admin: [...ALL_PERMISSIONS],
  admin: [...ALL_PERMISSIONS],
  manager: [
    'dashboard', 'products', 'raw-materials', 'categories', 'customers', 'vendors',
    'warehouses', 'purchase-orders', 'production', 'invoices', 'delivery-challans',
    'pos', 'movements', 'transfers', 'labels', 'expenses', 'payments', 'receipts',
    'investments', 'salaries', 'reports',
  ],
  staff: [
    'dashboard', 'products', 'raw-materials', 'production', 'invoices',
    'delivery-challans', 'pos', 'movements',
  ],
};

function defaultPermissionsForRole(role) {
  return [...(DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.staff)];
}

module.exports = { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, defaultPermissionsForRole };
