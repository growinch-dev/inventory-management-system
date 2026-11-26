import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Context
import { LanguageProvider } from './context/LanguageContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductForm from './pages/ProductForm';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceDetail from './pages/InvoiceDetail';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Warehouses from './pages/Warehouses';
import Transfers from './pages/Transfers';
import Movements from './pages/Movements';
import LabelGenerator from './pages/LabelGenerator';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Organizations from './pages/Organizations';
import Investments from './pages/Investments';
import Salaries from './pages/Salaries';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderForm from './pages/PurchaseOrderForm';
import PurchaseOrderReceive from './pages/PurchaseOrderReceive';
import Notifications from './pages/Notifications';
import Tenders from './pages/Tenders';
import TenderForm from './pages/TenderForm';
import TenderDetail from './pages/TenderDetail';
import DemoIssues from './pages/DemoIssues';
import DemoIssueForm from './pages/DemoIssueForm';
import DemoIssueDetail from './pages/DemoIssueDetail';
import DeliveryChallans from './pages/DeliveryChallans';
import DeliveryChallanForm from './pages/DeliveryChallanForm';
import DeliveryChallanDetail from './pages/DeliveryChallanDetail';
import POS from './pages/POS';
import Payments from './pages/Payments';
import Pricing from './pages/Pricing';
import Billing from './pages/Billing';
import LimitDemo from './pages/LimitDemo';
import Production from './pages/Production';
import ProductionForm from './pages/ProductionForm';
import RawMaterials from './pages/RawMaterials';
import Expenses from './pages/Expenses';
import Receipts from './pages/Receipts';
import Categories from './pages/Categories';
import Users from './pages/Users';
import Vendors from './pages/Vendors';

// Auth store
import useAuthStore from './store/authStore';

// Public Route - redirects to dashboard if already logged in
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
};

function App() {
  return (
    <LanguageProvider>
      <Router>
        {/* Toast Notifications */}
        <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1E293B',
            color: '#fff',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#059669',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#DC2626',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<Dashboard />} />

          {/* Products */}
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm />} />

          {/* Invoices */}
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/new" element={<InvoiceForm />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
          <Route path="invoices/:id/edit" element={<InvoiceForm />} />

          {/* Customers */}
          <Route path="customers" element={<Customers />} />

          {/* Suppliers */}
          <Route path="suppliers" element={<Suppliers />} />

          {/* Purchase Orders */}
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
          <Route path="purchase-orders/:id" element={<PurchaseOrderForm />} />
          <Route path="purchase-orders/:id/edit" element={<PurchaseOrderForm />} />
          <Route path="purchase-orders/:id/receive" element={<PurchaseOrderReceive />} />

          {/* Production */}
          <Route path="production" element={<Production />} />
          <Route path="production/new" element={<ProductionForm />} />
          <Route path="production/:id" element={<ProductionForm />} />

          {/* Raw Materials */}
          <Route path="raw-materials" element={<RawMaterials />} />

          {/* Categories */}
          <Route path="categories" element={<Categories />} />

          {/* Users */}
          <Route path="users" element={<Users />} />

          {/* Vendors */}
          <Route path="vendors" element={<Vendors />} />

          {/* Expenses */}
          <Route path="expenses" element={<Expenses />} />

          {/* Warehouses */}
          <Route path="warehouses" element={<Warehouses />} />

          {/* Transfers */}
          <Route path="transfers" element={<Transfers />} />

          {/* Stock Movements / Audit Trail */}
          <Route path="movements" element={<Movements />} />

          {/* Label Generator (QR/Barcode) */}
          <Route path="labels" element={<LabelGenerator />} />

          {/* Reports */}
          <Route path="reports" element={<Reports />} />

          {/* Settings */}
          <Route path="settings" element={<Settings />} />

          {/* Notifications */}
          <Route path="notifications" element={<Notifications />} />

          {/* Tenders */}
          <Route path="tenders" element={<Tenders />} />
          <Route path="tenders/new" element={<TenderForm />} />
          <Route path="tenders/:id" element={<TenderDetail />} />
          <Route path="tenders/:id/edit" element={<TenderForm />} />

          {/* Demo Issues */}
          <Route path="demo-issues" element={<DemoIssues />} />
          <Route path="demo-issues/new" element={<DemoIssueForm />} />
          <Route path="demo-issues/:id" element={<DemoIssueDetail />} />
          <Route path="demo-issues/:id/edit" element={<DemoIssueForm />} />

          {/* Delivery Challans */}
          <Route path="delivery-challans" element={<DeliveryChallans />} />
          <Route path="delivery-challans/new" element={<DeliveryChallanForm />} />
          <Route path="delivery-challans/:id" element={<DeliveryChallanDetail />} />
          <Route path="delivery-challans/:id/edit" element={<DeliveryChallanForm />} />

          {/* POS / Quick Billing */}
          <Route path="pos" element={<POS />} />

          {/* Payments */}
          <Route path="payments" element={<Payments />} />

          {/* Receipts */}
          <Route path="receipts" element={<Receipts />} />

          {/* Investments & Salary Payments */}
          <Route path="investments" element={<Investments />} />
          <Route path="salaries" element={<Salaries />} />

          {/* Subscription & Billing */}
          <Route path="pricing" element={<Pricing />} />
          <Route path="billing" element={<Billing />} />
          <Route path="settings/billing" element={<Billing />} />

          {/* Limit Enforcement Demo */}
          <Route path="limit-demo" element={<LimitDemo />} />

          {/* Platform admin (super admin) — customer onboarding */}
          <Route path="admin/organizations" element={<Organizations />} />
        </Route>

        {/* Per-customer branded login: inventory.growinch.com/<slug> */}
        <Route
          path="/:slug"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;
