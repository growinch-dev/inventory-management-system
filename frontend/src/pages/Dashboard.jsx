import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  FileText,
  Users,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  QrCode,
  Activity,
  RefreshCw,
  Warehouse,
  ArrowRightLeft,
  Calendar,
  Clock,
  ShoppingCart,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { dashboardAPI, warehousesAPI, transfersAPI, batchesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, StatCard, Badge, LoadingSpinner, EmptyState, Button } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';

// Design system colors for charts - Indigo theme palette
const CHART_COLORS = ['#6366F1', '#0EA5E9', '#22C55E', '#F97316', '#EF4444', '#A855F7'];

const Dashboard = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [transferStats, setTransferStats] = useState(null);
  const [expiryAlerts, setExpiryAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchWarehouses();
    fetchTransferStats();
    fetchExpiryAlerts();
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const response = await dashboardAPI.getStats();
      setStats(response.data.data);
      if (isRefresh) toast.success('Dashboard refreshed');
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehousesAPI.getList();
      setWarehouses(response.data.data || []);
    } catch (error) {
      console.error('Failed to load warehouses');
    }
  };

  const fetchTransferStats = async () => {
    try {
      const response = await transfersAPI.getStats();
      setTransferStats(response.data.data);
    } catch (error) {
      console.error('Failed to load transfer stats');
    }
  };

  const fetchExpiryAlerts = async () => {
    try {
      const response = await batchesAPI.getExpiryAlerts();
      setExpiryAlerts(response.data.data);
    } catch (error) {
      console.error('Failed to load expiry alerts');
    }
  };

  const overviewCards = [
    {
      title: t('dashboard.totalProducts'),
      value: stats?.overview?.totalProducts || 0,
      icon: Package,
      iconColor: 'info',
      href: '/products',
    },
    {
      title: t('dashboard.lowStock'),
      value: stats?.overview?.lowStockProducts || 0,
      icon: AlertTriangle,
      iconColor: 'danger',
      href: '/products?lowStock=true',
      highlight: (stats?.overview?.lowStockProducts || 0) > 0,
    },
    {
      title: t('invoices.title'),
      value: stats?.overview?.monthlyInvoices || 0,
      icon: FileText,
      iconColor: 'success',
      href: '/invoices',
    },
    {
      title: t('customers.title'),
      value: stats?.overview?.totalCustomers || 0,
      icon: Users,
      iconColor: 'primary',
      href: '/customers',
    },
  ];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label, formatter, labelFormatter }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-secondary-100">
          <p className="text-sm font-medium text-secondary mb-1">{labelFormatter ? labelFormatter(label) : label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm text-secondary-600">
              {formatter ? formatter(entry.value, entry.name)[0] : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <LoadingSpinner.Page />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <div className="flex gap-3">
            {/* Warehouse Selector */}
            {warehouses.length > 0 && (
              <div className="flex items-center gap-2 bg-secondary-50 rounded-lg px-3 py-1.5">
                <Warehouse size={16} className="text-secondary-400" />
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium text-secondary focus:outline-none cursor-pointer"
                >
                  <option value="">{t('warehouses.title')}</option>
                  {warehouses.map(wh => (
                    <option key={wh._id} value={wh._id}>{wh.name}</option>
                  ))}
                </select>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              icon={RefreshCw}
              className={refreshing ? 'animate-spin' : ''}
              aria-label="Refresh dashboard"
            >
              {refreshing ? '' : ''}
            </Button>
            <Button as={Link} to="/products/new" icon={Package}>
              {t('products.addProduct')}
            </Button>
            <Button as={Link} to="/invoices/new" variant="secondary" icon={FileText}>
              {t('invoices.createInvoice')}
            </Button>
          </div>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card, index) => (
          <StatCard
            key={index}
            title={card.title}
            value={card.value}
            icon={card.icon}
            iconColor={card.iconColor}
            href={card.href}
            className={card.highlight ? 'ring-2 ring-danger/20' : ''}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="transition-shadow hover:shadow-card-hover">
          <Card.Header>
            <Card.Title>Monthly Revenue</Card.Title>
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary-500 bg-secondary-50 px-2 py-1 rounded-full">
                {new Date().getFullYear()}
              </span>
              <TrendingUp className="text-primary" size={20} aria-hidden="true" />
            </div>
          </Card.Header>
          <Card.Content>
            {(stats?.revenueStats || []).length > 0 ? (
              <div className="h-72" role="img" aria-label="Monthly revenue bar chart showing revenue trends">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.revenueStats || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                    <XAxis
                      dataKey="_id"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#71717A' }}
                      tickFormatter={(month) => {
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return months[month - 1] || '';
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#71717A' }}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      content={<CustomTooltip
                        formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                        labelFormatter={(month) => {
                          const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                          return months[month - 1] || '';
                        }}
                      />}
                    />
                    <Bar dataKey="revenue" fill="#6366F1" radius={[6, 6, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="No revenue data"
                description="Revenue data will appear once you create invoices"
                compact
              />
            )}
          </Card.Content>
        </Card>

        {/* Category Distribution */}
        <Card className="transition-shadow hover:shadow-card-hover">
          <Card.Header>
            <Card.Title>Stock by Category</Card.Title>
            <Package className="text-primary" size={20} aria-hidden="true" />
          </Card.Header>
          <Card.Content>
            {(stats?.categoryStock || []).length > 0 ? (
              <div className="h-72" role="img" aria-label="Stock distribution pie chart by category">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.categoryStock || []}
                      dataKey="totalQuantity"
                      nameKey="_id"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      label={({ _id, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#A1A1AA', strokeWidth: 1 }}
                    >
                      {(stats?.categoryStock || []).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          className="transition-opacity hover:opacity-80"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<CustomTooltip formatter={(value, name) => [`${value} units`, name]} />}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => <span className="text-sm text-secondary-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={Package}
                title="No category data"
                description="Add products with categories to see distribution"
                compact
              />
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="transition-shadow hover:shadow-card-hover">
          <Card.Header>
            <Card.Title>Recent Activity</Card.Title>
            <Link
              to="/reports"
              className="text-primary text-sm font-medium hover:text-primary-dark flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </Card.Header>
          <Card.Content className="p-0">
            {stats?.recentMovements?.length > 0 ? (
              <ul className="divide-y divide-secondary-100" role="list" aria-label="Recent stock movements">
                {stats.recentMovements.slice(0, 5).map((movement, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-secondary-50/50 transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-transform hover:scale-105 ${
                        movement.type === 'in' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
                      }`}
                      aria-hidden="true"
                    >
                      {movement.type === 'in' ? '+' : '-'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary truncate">
                        {movement.product?.name || 'Unknown Product'}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {movement.type === 'in' ? 'Stock Added' : 'Stock Removed'} • {movement.quantity} units
                      </p>
                    </div>
                    <time className="text-xs text-secondary-400 whitespace-nowrap" dateTime={movement.createdAt}>
                      {new Date(movement.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Activity}
                title="No recent activity"
                description="Stock movements will appear here when you add or remove inventory"
                compact
              />
            )}
          </Card.Content>
        </Card>

        {/* Recent Invoices */}
        <Card className="transition-shadow hover:shadow-card-hover">
          <Card.Header>
            <Card.Title>Recent Invoices</Card.Title>
            <Link
              to="/invoices"
              className="text-primary text-sm font-medium hover:text-primary-dark flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </Card.Header>
          <Card.Content className="p-0">
            {stats?.recentInvoices?.length > 0 ? (
              <ul className="divide-y divide-secondary-100" role="list" aria-label="Recent invoices">
                {stats.recentInvoices.map((invoice, index) => (
                  <li key={index}>
                    <Link
                      to={`/invoices/${invoice._id}`}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-secondary-50/50 transition-colors focus:outline-none focus-visible:bg-primary-50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center transition-transform hover:scale-105" aria-hidden="true">
                        <FileText className="text-primary" size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-secondary">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-secondary-500 truncate">{invoice.customer?.name}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <p className="text-sm font-semibold text-secondary">
                          ₹{invoice.grandTotal?.toLocaleString('en-IN')}
                        </p>
                        <Badge
                          variant={
                            invoice.status === 'paid' ? 'success' :
                            invoice.status === 'sent' ? 'info' :
                            invoice.status === 'overdue' ? 'danger' : 'gray'
                          }
                          size="sm"
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={FileText}
                title="No recent invoices"
                description="Create your first invoice to see it here"
                compact
                action={{
                  label: 'Create Invoice',
                  to: '/invoices/new',
                }}
              />
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Pending Transfers Alert */}
      {transferStats?.recent?.length > 0 && (
        <Card className="border-l-4 border-l-warning">
          <Card.Header>
            <div className="flex items-center gap-2">
              <ArrowRightLeft size={20} className="text-warning" />
              <Card.Title>Pending Transfers</Card.Title>
            </div>
            <Link
              to="/transfers"
              className="text-primary text-sm font-medium hover:text-primary-dark flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight size={14} />
            </Link>
          </Card.Header>
          <Card.Content className="p-0">
            <ul className="divide-y divide-secondary-100">
              {transferStats.recent.filter(t => ['pending', 'in_transit'].includes(t.status)).slice(0, 3).map((transfer, index) => (
                <li key={index} className="flex items-center gap-4 px-6 py-3 hover:bg-secondary-50/50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    transfer.status === 'in_transit' ? 'bg-info-light' : 'bg-warning-light'
                  }`}>
                    <ArrowRightLeft size={18} className={transfer.status === 'in_transit' ? 'text-info' : 'text-warning'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary">{transfer.transferNumber}</p>
                    <p className="text-xs text-secondary-500">
                      {transfer.fromWarehouseName} → {transfer.toWarehouseName}
                    </p>
                  </div>
                  <Badge variant={transfer.status === 'in_transit' ? 'info' : 'warning'} size="sm">
                    {transfer.status === 'in_transit' ? 'In Transit' : 'Pending'}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      )}

      {/* Batch Expiry Alerts */}
      {expiryAlerts && (expiryAlerts.expired?.count > 0 || expiryAlerts.critical?.count > 0 || expiryAlerts.warning?.count > 0) && (
        <Card className={`border-l-4 ${expiryAlerts.expired?.count > 0 ? 'border-l-danger' : expiryAlerts.critical?.count > 0 ? 'border-l-danger' : 'border-l-warning'}`}>
          <Card.Header>
            <div className="flex items-center gap-2">
              <Calendar size={20} className={expiryAlerts.expired?.count > 0 ? 'text-danger' : 'text-warning'} />
              <Card.Title>{t('batches.expiryAlerts')}</Card.Title>
            </div>
            <div className="flex items-center gap-3">
              {expiryAlerts.expired?.count > 0 && (
                <Badge variant="danger" size="sm">{expiryAlerts.expired.count} {t('batches.expired')}</Badge>
              )}
              {expiryAlerts.critical?.count > 0 && (
                <Badge variant="danger" size="sm">{expiryAlerts.critical.count} Critical</Badge>
              )}
              {expiryAlerts.warning?.count > 0 && (
                <Badge variant="warning" size="sm">{expiryAlerts.warning.count} Warning</Badge>
              )}
            </div>
          </Card.Header>
          <Card.Content className="p-0">
            <ul className="divide-y divide-secondary-100">
              {/* Show expired batches first */}
              {expiryAlerts.expired?.batches?.slice(0, 2).map((batch, index) => (
                <li key={`expired-${index}`} className="flex items-center gap-4 px-6 py-3 hover:bg-secondary-50/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-danger-light flex items-center justify-center">
                    <AlertTriangle size={18} className="text-danger" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary truncate">{batch.productName}</p>
                    <p className="text-xs text-secondary-500">
                      {t('batches.batchNumber')}: {batch.batchNumber} • {batch.currentQuantity} units
                    </p>
                  </div>
                  <Badge variant="danger" size="sm">{t('batches.expired')}</Badge>
                </li>
              ))}
              {/* Then critical (expiring in 7 days) */}
              {expiryAlerts.critical?.batches?.slice(0, 2).map((batch, index) => (
                <li key={`critical-${index}`} className="flex items-center gap-4 px-6 py-3 hover:bg-secondary-50/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-danger-light flex items-center justify-center">
                    <Clock size={18} className="text-danger" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary truncate">{batch.productName}</p>
                    <p className="text-xs text-secondary-500">
                      {t('batches.batchNumber')}: {batch.batchNumber} • {batch.currentQuantity} units
                    </p>
                  </div>
                  <Badge variant="danger" size="sm">
                    {Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} {t('batches.daysUntilExpiry').toLowerCase()}
                  </Badge>
                </li>
              ))}
              {/* Then warning (expiring in 15 days) */}
              {expiryAlerts.warning?.batches?.slice(0, 2).map((batch, index) => (
                <li key={`warning-${index}`} className="flex items-center gap-4 px-6 py-3 hover:bg-secondary-50/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-warning-light flex items-center justify-center">
                    <Clock size={18} className="text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary truncate">{batch.productName}</p>
                    <p className="text-xs text-secondary-500">
                      {t('batches.batchNumber')}: {batch.batchNumber} • {batch.currentQuantity} units
                    </p>
                  </div>
                  <Badge variant="warning" size="sm">
                    {Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} days
                  </Badge>
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="transition-shadow hover:shadow-card-hover">
        <Card.Header>
          <Card.Title>Quick Actions</Card.Title>
        </Card.Header>
        <Card.Content>
          <nav className="grid grid-cols-2 sm:grid-cols-6 gap-4" aria-label="Quick actions">
            {[
              { to: '/scanner', icon: QrCode, label: 'Scan QR', description: 'Quick product lookup', color: 'bg-accent-50 text-accent' },
              { to: '/products/new', icon: Package, label: 'Add Product', description: 'New inventory item', color: 'bg-info-light text-info' },
              { to: '/purchase-orders/new', icon: ShoppingCart, label: 'Create PO', description: 'New purchase order', color: 'bg-purple-50 text-purple-600' },
              { to: '/transfers', icon: ArrowRightLeft, label: 'New Transfer', description: 'Move inventory', color: 'bg-warning-light text-warning' },
              { to: '/invoices/new', icon: FileText, label: 'Create Invoice', description: 'Bill a customer', color: 'bg-success-light text-success' },
              { to: '/movements', icon: Activity, label: 'Audit Trail', description: 'View movements', color: 'bg-primary-50 text-primary' },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex flex-col items-center gap-3 p-5 rounded-xl bg-surface-50 hover:bg-surface-dark border border-transparent hover:border-secondary-200 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${action.color}`}>
                  <action.icon size={24} aria-hidden="true" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-semibold text-secondary block">{action.label}</span>
                  <span className="text-xs text-secondary-400 hidden sm:block">{action.description}</span>
                </div>
              </Link>
            ))}
          </nav>
        </Card.Content>
      </Card>
    </div>
  );
};

export default Dashboard;
