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
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardAPI, transfersAPI, batchesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, StatCard, Badge, LoadingSpinner, EmptyState, Button } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';

const inr = (n, digits = 0) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: 0 })}`;
const compactInr = (n) => {
  const v = Number(n || 0);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)}k`;
  return `₹${v}`;
};
const qty = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const REASON_LABELS = {
  purchase: 'Purchase received', sale: 'Sold', return: 'Returned', damage: 'Damaged', expired: 'Expired',
  adjustment: 'Stock adjustment', transfer: 'Transferred', initial: 'Opening stock', demo: 'Sample / trial', production: 'Production',
};

const Dashboard = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [stockView, setStockView] = useState('finished_good');
  const [transferStats, setTransferStats] = useState(null);
  const [expiryAlerts, setExpiryAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
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
      title: 'Invoices this month',
      value: stats?.overview?.monthlyInvoices || 0,
      icon: FileText,
      iconColor: 'success',
      href: '/invoices',
    },
    {
      title: 'To collect (receivables)',
      value: stats?.overview?.receivables || 0,
      format: 'currency',
      icon: IndianRupee,
      iconColor: 'warning',
      href: '/payments',
    },
  ];

  // Raw materials in one tab; finished goods (and anything else) in the other.
  const categoryRows = (stats?.categoryStock || []).filter((c) =>
    stockView === 'raw_material' ? c.productType === 'raw_material' : c.productType !== 'raw_material'
  );
  const maxCategoryValue = Math.max(1, ...categoryRows.map((c) => c.totalValue || 0));
  const revenueTotal = (stats?.revenueStats || []).reduce((sum, m) => sum + (m.revenue || 0), 0);

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
            format={card.format}
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
            <div>
              <Card.Title>Sales – last 6 months</Card.Title>
              <p className="text-xs text-secondary-500 mt-0.5">Billed invoices, excluding drafts and cancelled</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-secondary">{inr(revenueTotal)}</p>
              <p className="text-xs text-secondary-500">6-month total</p>
            </div>
          </Card.Header>
          <Card.Content>
            {revenueTotal > 0 ? (
              <div className="h-72" role="img" aria-label="Monthly revenue bar chart showing revenue trends">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.revenueStats || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#71717A' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      tick={{ fontSize: 12, fill: '#71717A' }}
                      tickFormatter={compactInr}
                    />
                    <Tooltip
                      cursor={{ fill: '#EEF2FF' }}
                      content={<CustomTooltip
                        formatter={(value) => [inr(value)]}
                        labelFormatter={(label) => label}
                      />}
                    />
                    <Bar dataKey="revenue" name="Sales" fill="#6366F1" radius={[6, 6, 0, 0]} maxBarSize={44} />
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

        {/* Stock value by category */}
        <Card className="transition-shadow hover:shadow-card-hover">
          <Card.Header>
            <div>
              <Card.Title>Stock value by category</Card.Title>
              <p className="text-xs text-secondary-500 mt-0.5">Quantity in stock × selling price</p>
            </div>
            <div className="inline-flex rounded-lg bg-secondary-100 p-0.5 text-xs font-medium" role="tablist">
              {[
                ['finished_good', 'Finished goods'],
                ['raw_material', 'Raw materials'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={stockView === key}
                  onClick={() => setStockView(key)}
                  className={`px-3 py-1.5 rounded-md transition-colors ${stockView === key ? 'bg-white text-secondary shadow-sm' : 'text-secondary-500 hover:text-secondary'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Card.Header>
          <Card.Content>
            {categoryRows.length > 0 ? (
              <ul className="space-y-3.5 h-72 overflow-y-auto pr-1" aria-label="Stock value by category">
                {categoryRows.map((c) => (
                  <li key={c._id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-secondary truncate">{c.name}</span>
                      <span className="font-semibold text-secondary whitespace-nowrap">{inr(c.totalValue)}</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-secondary-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${stockView === 'raw_material' ? 'bg-amber-500' : 'bg-primary'}`}
                        style={{ width: `${Math.max(2, (c.totalValue / maxCategoryValue) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-secondary-500">
                      {qty(c.totalQuantity)} {(c.unit || 'units').toLowerCase()} • {c.productCount} {c.productCount === 1 ? 'product' : 'products'}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Package}
                title="No stock in this group"
                description="Add products with a category to see stock value here"
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
              to="/movements"
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
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        movement.type === 'in' ? 'bg-success-light text-success' : movement.type === 'out' ? 'bg-danger-light text-danger' : 'bg-info-light text-info'
                      }`}
                      aria-hidden="true"
                    >
                      {movement.type === 'in' ? <ArrowDownRight size={18} /> : movement.type === 'out' ? <ArrowUpRight size={18} /> : <ArrowRightLeft size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary truncate">
                        {movement.product?.name || 'Unknown Product'}
                      </p>
                      <p className="text-xs text-secondary-500 truncate">
                        <span className={movement.type === 'in' ? 'text-success font-medium' : movement.type === 'out' ? 'text-danger font-medium' : 'font-medium'}>
                          {movement.type === 'in' ? '+' : movement.type === 'out' ? '−' : ''}{qty(movement.quantity)}
                        </span>
                        {' • '}{REASON_LABELS[movement.reason] || movement.reason}
                        {movement.reference ? ` • ${movement.reference}` : ''}
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
