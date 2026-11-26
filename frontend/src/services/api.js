import axios from 'axios';

// Relative '/api' by default so the app works on localhost, a LAN IP, or any
// domain with no rebuild. In dev, Vite proxies '/api' to the backend; in
// production the Express server serves this build and the API from one origin.
// Override with VITE_API_URL only when the API lives on a different host.
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if already on login page or if it's a login request
      const isLoginPage = window.location.pathname === '/login';
      const isLoginRequest = error.config?.url?.includes('/auth/login');

      if (!isLoginPage && !isLoginRequest) {
        // Clear all auth-related storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage'); // Clear zustand persisted state
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateDetails: (data) => api.put('/auth/updatedetails', data),
  updatePassword: (data) => api.put('/auth/updatepassword', data),
};

// Investments API (capital / owner contributions)
export const investmentsAPI = {
  getAll: (params) => api.get('/investments', { params }),
  create: (data) => api.post('/investments', data),
  delete: (id) => api.delete(`/investments/${id}`),
};

// Expenses API
export const expensesAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

// Salary payments API
export const salariesAPI = {
  getAll: (params) => api.get('/salaries', { params }),
  create: (data) => api.post('/salaries', data),
  delete: (id) => api.delete(`/salaries/${id}`),
};

// Roles & module access API
export const rolesAPI = {
  getAll: () => api.get('/roles'),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
};

// Categories API
export const categoriesAPI = {
  getAll: (params) => api.get('/categories', { params }),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Tenant / Organization API
export const tenantAPI = {
  get: () => api.get('/tenant'),
  update: (data) => api.put('/tenant', data),
  getBySlug: (slug) => api.get(`/tenant/by-slug/${slug}`), // public branding
};

// Platform admin (GrowInch super admin) — customer onboarding
export const adminAPI = {
  getTenants: () => api.get('/admin/tenants'),
  createTenant: (data) => api.post('/admin/tenants', data),
};

// Production API
export const productionAPI = {
  getAll: (params) => api.get('/production', { params }),
  getOne: (id) => api.get(`/production/${id}`),
  create: (data) => api.post('/production', data),
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  getBySku: (sku) => api.get(`/products/sku/${sku}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  updateStock: (id, data) => api.post(`/products/${id}/stock`, data),
  getLowStock: () => api.get('/products/low-stock'),
  getMovements: (id, params) => api.get(`/products/${id}/movements`, { params }),
  regenerateQR: (id) => api.post(`/products/${id}/regenerate-qr`),
};

// Invoices API
export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getOne: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  updateStatus: (id, data) => api.patch(`/invoices/${id}/status`, data),
  confirm: (id) => api.patch(`/invoices/${id}/confirm`),
  dispatch: (id, data) => api.patch(`/invoices/${id}/dispatch`, data),
  deliver: (id) => api.patch(`/invoices/${id}/deliver`),
  duplicate: (id) => api.post(`/invoices/${id}/duplicate`),
  getStats: () => api.get('/invoices/stats'),
};

// Suppliers API
export const suppliersAPI = {
  getAll: (params) => api.get('/suppliers', { params }),
  getOne: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

// Customers API
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getOne: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getInventoryValue: () => api.get('/dashboard/inventory-value'),
  getQRActivity: (params) => api.get('/dashboard/qr-activity', { params }),
};

// QR API
export const qrAPI = {
  recordScan: (data) => api.post('/qr/scan', data),
  getHistory: (params) => api.get('/qr/history', { params }),
  bulkGenerate: (productIds) => api.post('/qr/bulk-generate', { productIds }),
  getAnalytics: (params) => api.get('/qr/analytics', { params }),
};

// Warehouses API
export const warehousesAPI = {
  getAll: (params) => api.get('/warehouses', { params }),
  getList: () => api.get('/warehouses/list'),
  getOne: (id) => api.get(`/warehouses/${id}`),
  create: (data) => api.post('/warehouses', data),
  update: (id, data) => api.put(`/warehouses/${id}`, data),
  delete: (id) => api.delete(`/warehouses/${id}`),
  getStats: (id) => api.get(`/warehouses/${id}/stats`),
};

// Transfers API
export const transfersAPI = {
  getAll: (params) => api.get('/transfers', { params }),
  getOne: (id) => api.get(`/transfers/${id}`),
  create: (data) => api.post('/transfers', data),
  ship: (id, data) => api.put(`/transfers/${id}/ship`, data),
  receive: (id, data) => api.put(`/transfers/${id}/receive`, data),
  cancel: (id) => api.put(`/transfers/${id}/cancel`),
  getStats: () => api.get('/transfers/stats'),
};

// Stock Movements API
export const movementsAPI = {
  getAll: (params) => api.get('/movements', { params }),
  getByProduct: (productId, params) => api.get(`/movements/product/${productId}`, { params }),
  getStats: (params) => api.get('/movements/stats', { params }),
  export: (params) => api.get('/movements/export', { params }),
};

// Purchase Orders API
export const purchaseOrdersAPI = {
  getAll: (params) => api.get('/purchase-orders', { params }),
  getOne: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  delete: (id) => api.delete(`/purchase-orders/${id}`),
  confirm: (id) => api.patch(`/purchase-orders/${id}/confirm`),
  receive: (id, data) => api.patch(`/purchase-orders/${id}/receive`, data),
  cancel: (id) => api.patch(`/purchase-orders/${id}/cancel`),
  duplicate: (id) => api.post(`/purchase-orders/${id}/duplicate`),
  getStats: (params) => api.get('/purchase-orders/stats', { params }),
};

// Batches API
export const batchesAPI = {
  getAll: (params) => api.get('/batches', { params }),
  getOne: (id) => api.get(`/batches/${id}`),
  getByProduct: (productId, params) => api.get(`/products/${productId}/batches`, { params }),
  create: (data) => api.post('/batches', data),
  update: (id, data) => api.put(`/batches/${id}`, data),
  markExpired: (id, data) => api.patch(`/batches/${id}/expire`, data),
  quarantine: (id, data) => api.patch(`/batches/${id}/quarantine`, data),
  getExpiryAlerts: (params) => api.get('/batches/expiry/alerts', { params }),
  getStats: (params) => api.get('/batches/stats', { params }),
  selectFIFO: (data) => api.post('/batches/select-fifo', data),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  getStats: () => api.get('/notifications/stats'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearRead: () => api.delete('/notifications/clear-read'),
  triggerAlerts: () => api.post('/notifications/trigger-alerts'),
};

// Tenders API
export const tendersAPI = {
  getAll: (params) => api.get('/tenders', { params }),
  getOne: (id) => api.get(`/tenders/${id}`),
  create: (data) => api.post('/tenders', data),
  update: (id, data) => api.put(`/tenders/${id}`, data),
  delete: (id) => api.delete(`/tenders/${id}`),
  updateStatus: (id, data) => api.patch(`/tenders/${id}/status`, data),
  updateEmd: (id, data) => api.patch(`/tenders/${id}/emd`, data),
  updateSecurityDeposit: (id, data) => api.patch(`/tenders/${id}/security-deposit`, data),
  addSupplyOrder: (id, data) => api.post(`/tenders/${id}/supply`, data),
  updateSupplyOrder: (id, supplyId, data) => api.patch(`/tenders/${id}/supply/${supplyId}`, data),
  addPayment: (id, data) => api.post(`/tenders/${id}/payment`, data),
  getStats: () => api.get('/tenders/stats'),
  getEmdReport: (params) => api.get('/tenders/reports/emd', { params }),
  getSecurityDepositReport: (params) => api.get('/tenders/reports/security-deposit', { params }),
  getPendingSupplyReport: () => api.get('/tenders/reports/pending-supply'),
};

// Demo Issues API
export const demoIssuesAPI = {
  getAll: (params) => api.get('/demo-issues', { params }),
  getOne: (id) => api.get(`/demo-issues/${id}`),
  create: (data) => api.post('/demo-issues', data),
  update: (id, data) => api.put(`/demo-issues/${id}`, data),
  delete: (id) => api.delete(`/demo-issues/${id}`),
  issue: (id, data) => api.patch(`/demo-issues/${id}/issue`, data),
  returnItems: (id, data) => api.patch(`/demo-issues/${id}/return`, data),
  extend: (id, data) => api.patch(`/demo-issues/${id}/extend`, data),
  updateFollowUp: (id, data) => api.patch(`/demo-issues/${id}/follow-up`, data),
  getStats: () => api.get('/demo-issues/stats'),
  getOverdue: () => api.get('/demo-issues/overdue'),
};

// Delivery Challans API
export const deliveryChallansAPI = {
  getAll: (params) => api.get('/delivery-challans', { params }),
  getOne: (id) => api.get(`/delivery-challans/${id}`),
  create: (data) => api.post('/delivery-challans', data),
  update: (id, data) => api.put(`/delivery-challans/${id}`, data),
  delete: (id) => api.delete(`/delivery-challans/${id}`),
  dispatch: (id, data) => api.patch(`/delivery-challans/${id}/dispatch`, data),
  deliver: (id, data) => api.patch(`/delivery-challans/${id}/deliver`, data),
  returnItems: (id, data) => api.patch(`/delivery-challans/${id}/return`, data),
  convertToInvoice: (id, data) => api.patch(`/delivery-challans/${id}/convert-to-invoice`, data),
  getStats: () => api.get('/delivery-challans/stats'),
  getOverdue: () => api.get('/delivery-challans/overdue'),
  createFromInvoice: (invoiceId, data) => api.post(`/delivery-challans/from-invoice/${invoiceId}`, data),
  createFromDemoIssue: (demoIssueId, data) => api.post(`/delivery-challans/from-demo-issue/${demoIssueId}`, data),
};

// Payments API
export const paymentsAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getOne: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
  getByInvoice: (invoiceId) => api.get(`/payments/invoice/${invoiceId}`),
  getByCustomer: (customerId) => api.get(`/payments/customer/${customerId}`),
  getStats: () => api.get('/payments/stats'),
  getOutstanding: (params) => api.get('/payments/outstanding', { params }),
  updateChequeStatus: (id, data) => api.patch(`/payments/${id}/cheque-status`, data),
};

// Reports API
export const reportsAPI = {
  getSales: (params) => api.get('/reports/sales', { params }),
  getPurchases: (params) => api.get('/reports/purchases', { params }),
  getPayments: (params) => api.get('/reports/payments', { params }),
  getTenders: (params) => api.get('/reports/tenders', { params }),
  getInventory: () => api.get('/reports/inventory'),
  getMovements: (params) => api.get('/reports/movements', { params }),
  getExpiry: () => api.get('/reports/expiry'),
  getProfitLoss: (params) => api.get('/reports/profit-loss', { params }),
};

// Subscriptions API
export const subscriptionsAPI = {
  getPlans: () => api.get('/subscriptions/plans'),
  getCurrentSubscription: () => api.get('/subscriptions/current'),
  subscribe: (data) => api.post('/subscriptions/subscribe', data),
  changePlan: (data) => api.post('/subscriptions/change-plan', data),
  cancelSubscription: () => api.post('/subscriptions/cancel'),
  getUsage: () => api.get('/subscriptions/usage'),
  getPaymentHistory: () => api.get('/subscriptions/invoices'),
  applyCoupon: (code) => api.post('/subscriptions/apply-coupon', { code }),
};

export default api;
