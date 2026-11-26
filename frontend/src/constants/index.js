// Product categories
export const PRODUCT_CATEGORIES = [
  // Finished Goods - Mineral Water
  { value: 'mineral_water_250ml', label: 'Mineral Water - 250ml' },
  { value: 'mineral_water_500ml', label: 'Mineral Water - 500ml' },
  { value: 'mineral_water_1l', label: 'Mineral Water - 1 Liter' },
  { value: 'mineral_water_2l', label: 'Mineral Water - 2 Liter' },
  { value: 'mineral_water_20l', label: 'Mineral Water - 20 Liter Jar' },
  // Raw Materials
  { value: 'raw_material_bottles', label: 'Raw Material - Bottles' },
  { value: 'raw_material_caps', label: 'Raw Material - Caps & Closures' },
  { value: 'raw_material_labels', label: 'Raw Material - Labels' },
  { value: 'raw_material_packaging', label: 'Raw Material - Packaging' },
  { value: 'raw_material_chemicals', label: 'Raw Material - Chemicals' },
  { value: 'raw_material_filters', label: 'Raw Material - Filters' },
  { value: 'Other', label: 'Other' },
];

// Module access list (must match backend config/rolePermissions ALL_PERMISSIONS)
export const MODULE_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard', group: 'Main' },
  { id: 'products', label: 'Products', group: 'Masters' },
  { id: 'raw-materials', label: 'Raw Materials', group: 'Masters' },
  { id: 'categories', label: 'Categories', group: 'Masters' },
  { id: 'customers', label: 'Customers', group: 'Masters' },
  { id: 'vendors', label: 'Vendors', group: 'Masters' },
  { id: 'warehouses', label: 'Warehouses', group: 'Masters' },
  { id: 'purchase-orders', label: 'Purchases', group: 'Operations' },
  { id: 'production', label: 'Production', group: 'Operations' },
  { id: 'invoices', label: 'Sales', group: 'Operations' },
  { id: 'delivery-challans', label: 'Delivery Challans', group: 'Operations' },
  { id: 'pos', label: 'POS / Quick Sale', group: 'Operations' },
  { id: 'movements', label: 'Stock Movements', group: 'Inventory' },
  { id: 'transfers', label: 'Transfers', group: 'Inventory' },
  { id: 'labels', label: 'Labels & QR', group: 'Inventory' },
  { id: 'expenses', label: 'Expenses', group: 'Accounts' },
  { id: 'payments', label: 'Payments', group: 'Accounts' },
  { id: 'receipts', label: 'Receipts', group: 'Accounts' },
  { id: 'investments', label: 'Investments', group: 'Accounts' },
  { id: 'salaries', label: 'Salary Payments', group: 'Accounts' },
  { id: 'reports', label: 'Reports', group: 'Reports & Tools' },
  { id: 'users', label: 'Users', group: 'Reports & Tools' },
  { id: 'settings', label: 'Settings', group: 'Reports & Tools' },
];

// Units of measurement
export const UNITS = [
  { value: 'PCS', label: 'Pieces (PCS)' },
  { value: 'BOX', label: 'Box (BOX)' },
  { value: 'CARTON', label: 'Carton (CARTON)' },
  { value: 'CRATE', label: 'Crate (CRATE)' },
  { value: 'KG', label: 'Kilogram (KG)' },
  { value: 'LTR', label: 'Liter (LTR)' },
  { value: 'ROLL', label: 'Roll (ROLL)' },
  { value: 'BAG', label: 'Bag (BAG)' },
  { value: 'SET', label: 'Set (SET)' },
];

// Invoice statuses
export const INVOICE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Customer types
export const CUSTOMER_TYPES = [
  { value: 'retailer', label: 'Retailer/Shop' },
  { value: 'distributor', label: 'Distributor/Wholesaler' },
  { value: 'hotel_restaurant', label: 'Hotel/Restaurant' },
  { value: 'corporate', label: 'Corporate/Office' },
  { value: 'government', label: 'Government Institution' },
  { value: 'event', label: 'Event Organizer' },
  { value: 'individual', label: 'Individual' },
];

// User roles
export const USER_ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
];

// Payment methods
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'credit', label: 'Credit' },
];

// Tax rates
export const TAX_RATES = [
  { value: 0, label: '0%' },
  { value: 5, label: '5%' },
  { value: 12, label: '12%' },
  { value: 18, label: '18%' },
  { value: 28, label: '28%' },
];

// Status color mapping
export const STATUS_COLORS = {
  // Invoice statuses
  draft: { bg: 'bg-gray-100', text: 'text-gray-800', variant: 'gray' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', variant: 'info' },
  dispatched: { bg: 'bg-yellow-100', text: 'text-yellow-800', variant: 'warning' },
  delivered: { bg: 'bg-green-100', text: 'text-green-800', variant: 'success' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-800', variant: 'info' },
  paid: { bg: 'bg-green-100', text: 'text-green-800', variant: 'success' },
  overdue: { bg: 'bg-red-100', text: 'text-red-800', variant: 'danger' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', variant: 'gray' },

  // Stock statuses
  in_stock: { bg: 'bg-green-100', text: 'text-green-800', variant: 'success' },
  low_stock: { bg: 'bg-yellow-100', text: 'text-yellow-800', variant: 'warning' },
  out_of_stock: { bg: 'bg-red-100', text: 'text-red-800', variant: 'danger' },

  // General
  active: { bg: 'bg-green-100', text: 'text-green-800', variant: 'success' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-600', variant: 'gray' },
};

// Indian states for address forms
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
].map(state => ({ value: state, label: state }));

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
};

// Date formats
export const DATE_FORMATS = {
  display: 'dd MMM yyyy',
  input: 'yyyy-MM-dd',
  datetime: 'dd MMM yyyy, HH:mm',
};
