import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  Truck,
  Warehouse,
  ArrowRightLeft,
  Activity,
  Tags,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  Gavel,
  Stethoscope,
  ClipboardList,
  Zap,
  IndianRupee,
  TrendingUp,
  Wallet,
  FolderTree,
  UserCog,
  Building2,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import growinchLogo from '../assets/growinch-logo.png';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from '../components/ui';
import NotificationCenter from '../components/NotificationCenter';

// Grouped navigation structure
const navigationGroups = [
  {
    id: 'main',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    id: 'masters',
    label: 'Masters',
    items: [
      { name: 'Products', href: '/products', icon: Package },
      { name: 'Raw Materials', href: '/raw-materials', icon: Package },
      { name: 'Categories', href: '/categories', icon: FolderTree },
      { name: 'Customers', href: '/customers', icon: Users },
      { name: 'Vendors', href: '/vendors', icon: Building2 },
      { name: 'Warehouses', href: '/warehouses', icon: Warehouse },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { name: 'Purchases', href: '/purchase-orders', icon: ShoppingCart },
      { name: 'Production', href: '/production', icon: Activity },
      { name: 'Sales', href: '/invoices', icon: FileText },
      { name: 'Delivery Challans', href: '/delivery-challans', icon: ClipboardList },
      { name: 'POS / Quick Sale', href: '/pos', icon: Zap },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    items: [
      { name: 'Stock Movements', href: '/movements', icon: ArrowRightLeft },
      { name: 'Transfers', href: '/transfers', icon: ArrowRightLeft },
      { name: 'Labels & QR', href: '/labels', icon: Tags },
    ],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    items: [
      { name: 'Expenses', href: '/expenses', icon: FileText },
      { name: 'Payments', href: '/payments', icon: IndianRupee },
      { name: 'Receipts', href: '/receipts', icon: IndianRupee },
      { name: 'Investments', href: '/investments', icon: TrendingUp },
      { name: 'Salary Payments', href: '/salaries', icon: Wallet },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Tools',
    items: [
      { name: 'Reports', href: '/reports', icon: BarChart3 },
      { name: 'Users', href: '/users', icon: UserCog },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    items: [
      { name: 'Organizations', href: '/admin/organizations', icon: Building2, superAdminOnly: true },
    ],
  },
];

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const userMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, tenant, logout } = useAuthStore();
  const { t } = useLanguage();

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  // Check if user has permission to view a menu item
  const hasPermission = (href) => {
    // Owner and admins have access to all menus
    if (user?.isOwner || user?.role === 'admin' || user?.role === 'super_admin') {
      return true;
    }

    // Dashboard is always accessible
    if (href === '/') return true;

    // Map href to permission key
    const permissionMap = {
      '/products': 'products',
      '/raw-materials': 'raw-materials',
      '/categories': 'categories',
      '/customers': 'customers',
      '/vendors': 'vendors',
      '/warehouses': 'warehouses',
      '/purchase-orders': 'purchase-orders',
      '/production': 'production',
      '/invoices': 'invoices',
      '/delivery-challans': 'delivery-challans',
      '/pos': 'pos',
      '/movements': 'movements',
      '/transfers': 'transfers',
      '/labels': 'labels',
      '/expenses': 'expenses',
      '/payments': 'payments',
      '/receipts': 'receipts',
      '/investments': 'investments',
      '/salaries': 'salaries',
      '/reports': 'reports',
      '/users': 'users',
      '/settings': 'settings',
    };

    const permissionKey = permissionMap[href];
    if (!permissionKey) return true; // If no mapping, allow access

    // Check if user has this permission
    return user?.permissions?.includes(permissionKey);
  };

  // Filter navigation groups based on permissions
  const filteredNavigationGroups = navigationGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      item.superAdminOnly ? user?.role === 'super_admin' : hasPermission(item.href)
    ),
  })).filter((group) => group.items.length > 0); // Remove empty groups

  return (
    <div className="min-h-screen bg-surface">
      {/* Mobile sidebar backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-secondary-200 transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-secondary-100">
          <Link to="/" className="flex items-center gap-2.5 group min-w-0">
            {tenant?.settings?.logo ? (
              <>
                <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white border border-secondary-100 flex-shrink-0">
                  <img src={tenant.settings.logo} alt={tenant.name || 'Company logo'} className="max-w-full max-h-full object-contain" />
                </div>
                <span className="font-heading font-bold text-secondary truncate">{tenant.name}</span>
              </>
            ) : tenant?.name ? (
              <>
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-700 rounded-xl flex items-center justify-center shadow-sm shadow-primary/20 transition-transform group-hover:scale-105 flex-shrink-0">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <span className="font-heading font-bold text-secondary truncate">{tenant.name}</span>
              </>
            ) : (
              <img src={growinchLogo} alt="GrowInch" className="h-8 object-contain" />
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-2 overflow-y-auto h-[calc(100vh-64px-72px)] scrollbar-thin" aria-label="Sidebar navigation">
          {filteredNavigationGroups.map((group) => (
            <div key={group.id} className="mb-1">
              {group.label && (
                <div className="px-3 py-2 text-xs font-semibold text-secondary-400 uppercase tracking-wider">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-primary-50 text-primary'
                          : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <item.icon size={18} className={active ? 'text-primary' : 'text-secondary-400'} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-secondary-100 bg-white">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-danger hover:bg-danger-light transition-colors"
          >
            <LogOut size={20} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 min-h-screen flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-secondary-200 px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-lg transition-colors"
              aria-label="Open sidebar"
            >
              <Menu size={24} />
            </button>

            <div className={`hidden sm:flex items-center gap-2 rounded-xl px-4 py-2.5 w-72 transition-all duration-200 ${
              searchFocused ? 'bg-white ring-2 ring-primary/20 shadow-sm' : 'bg-secondary-50'
            }`}>
              <Search size={18} className={`transition-colors ${searchFocused ? 'text-primary' : 'text-secondary-400'}`} />
              <input
                type="text"
                placeholder="Search products, invoices..."
                className="bg-transparent border-none outline-none text-sm w-full text-secondary placeholder:text-secondary-400"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                aria-label="Search"
              />
              <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-secondary-400 bg-secondary-100 rounded-md">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="compact" />

            <NotificationCenter />

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors ${
                  userMenuOpen ? 'bg-secondary-100' : 'hover:bg-secondary-50'
                }`}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-700 rounded-xl flex items-center justify-center text-white font-semibold shadow-sm shadow-primary/20">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-secondary">{user?.name}</p>
                  <p className="text-xs text-secondary-500 capitalize">{user?.role}</p>
                </div>
                <ChevronDown size={16} className={`text-secondary-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-secondary-100 py-1.5 animate-scale-in origin-top-right">
                  <div className="px-4 py-2.5 border-b border-secondary-100 sm:hidden">
                    <p className="font-semibold text-secondary">{user?.name}</p>
                    <p className="text-xs text-secondary-500 capitalize">{user?.role}</p>
                  </div>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings size={16} className="text-secondary-400" />
                    {t('nav.settings')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-danger-light transition-colors"
                  >
                    <LogOut size={16} />
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="px-4 lg:px-8 py-4 border-t border-secondary-100 text-center text-xs text-secondary-400">
          GrowInch &copy; {new Date().getFullYear()} • Inventory Management System
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
