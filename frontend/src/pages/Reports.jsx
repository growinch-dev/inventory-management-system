import { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Package,
  FileText,
  Users,
  IndianRupee,
  AlertTriangle,
  ShoppingCart,
  Gavel,
  Activity,
  Clock,
  Filter,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { reportsAPI, dashboardAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COLORS = ['#059669', '#1E293B', '#B45309', '#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6'];

const REPORT_TYPES = [
  { id: 'sales', label: 'Sales Report', icon: FileText },
  { id: 'purchases', label: 'Purchase Report', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory Report', icon: Package },
  { id: 'payments', label: 'Payment Report', icon: IndianRupee },
  { id: 'movements', label: 'Stock Movements', icon: Activity },
  { id: 'expiry', label: 'Expiry Report', icon: Clock },
  { id: 'tenders', label: 'Tender Report', icon: Gavel },
  { id: 'profitLoss', label: 'Profit & Loss', icon: TrendingUp },
];

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

const Reports = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('month');
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchReportData();
  }, [reportType, dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      let response;

      switch (reportType) {
        case 'sales':
          response = await reportsAPI.getSales({ range: dateRange });
          break;
        case 'purchases':
          response = await reportsAPI.getPurchases({ range: dateRange });
          break;
        case 'inventory':
          response = await reportsAPI.getInventory();
          break;
        case 'payments':
          response = await reportsAPI.getPayments({ range: dateRange });
          break;
        case 'movements':
          response = await reportsAPI.getMovements({ range: dateRange });
          break;
        case 'expiry':
          response = await reportsAPI.getExpiry();
          break;
        case 'tenders':
          response = await reportsAPI.getTenders({ range: dateRange });
          break;
        case 'profitLoss':
          response = await reportsAPI.getProfitLoss({ range: dateRange });
          break;
        default:
          response = await reportsAPI.getSales({ range: dateRange });
      }

      setReportData(response.data.data);
    } catch (error) {
      console.error('Failed to load report:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');

    // Generate CSV based on report type
    if (reportType === 'sales' && reportData.trend) {
      csvContent += 'Date,Sales,Orders\n';
      reportData.trend.forEach((row) => {
        csvContent += `${row._id},${row.sales},${row.orders}\n`;
      });
    } else if (reportType === 'inventory' && reportData.byCategory) {
      csvContent += 'Category,Count,Quantity,Value\n';
      reportData.byCategory.forEach((row) => {
        csvContent += `${row._id},${row.count},${row.totalQuantity},${row.totalValue}\n`;
      });
    } else if (reportType === 'expiry') {
      csvContent += 'Status,Count,Quantity,Value\n';
      Object.entries(reportData.summary || {}).forEach(([key, data]) => {
        csvContent += `${key},${data.count},${data.quantity},${data.value || 0}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportType}_report_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Report exported successfully');
  };

  const formatCurrency = (value) => {
    return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const renderSalesReport = () => {
    if (!reportData) return null;
    const { summary, trend, topCustomers, topProducts, byCategory, byStatus } = reportData;

    return (
      <>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Total Sales"
            value={formatCurrency(summary?.totalSales)}
            icon={IndianRupee}
            color="primary"
          />
          <SummaryCard
            title="Total Invoices"
            value={summary?.totalInvoices || 0}
            icon={FileText}
            color="blue"
          />
          <SummaryCard
            title="Avg Order Value"
            value={formatCurrency(summary?.avgOrderValue)}
            icon={TrendingUp}
            color="green"
          />
          <SummaryCard
            title="Total Tax"
            value={formatCurrency(summary?.totalTax)}
            icon={IndianRupee}
            color="amber"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sales Trend */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Sales Trend</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="_id" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), 'Sales']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#059669" fill="#059669" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales by Status */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Invoice Status</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(byStatus || []).map((s) => ({ ...s, label: String(s._id || '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) }))}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="label"
                  >
                    {(byStatus || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} invoice${value === 1 ? '' : 's'}`, name]} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Customers */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Top Customers</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">Customer</th>
                    <th className="table-header text-center">Orders</th>
                    <th className="table-header text-right">Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {(topCustomers || []).slice(0, 5).map((customer, index) => (
                    <tr key={index} className="border-b border-gray-50">
                      <td className="table-cell font-medium">{customer.name || 'Unknown'}</td>
                      <td className="table-cell text-center">{customer.orderCount}</td>
                      <td className="table-cell text-right font-semibold text-primary">
                        {formatCurrency(customer.totalSpent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Products */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Top Products</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">Product</th>
                    <th className="table-header text-center">Qty Sold</th>
                    <th className="table-header text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(topProducts || []).slice(0, 5).map((product, index) => (
                    <tr key={index} className="border-b border-gray-50">
                      <td className="table-cell">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sku}</p>
                      </td>
                      <td className="table-cell text-center">{product.totalQty}</td>
                      <td className="table-cell text-right font-semibold text-primary">
                        {formatCurrency(product.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderPurchaseReport = () => {
    if (!reportData) return null;
    const { summary, trend, topSuppliers, byStatus } = reportData;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Total Purchases"
            value={formatCurrency(summary?.totalPurchases)}
            icon={ShoppingCart}
            color="primary"
          />
          <SummaryCard
            title="Total Orders"
            value={summary?.totalOrders || 0}
            icon={FileText}
            color="blue"
          />
          <SummaryCard
            title="Avg Order Value"
            value={formatCurrency(summary?.avgOrderValue)}
            icon={TrendingUp}
            color="green"
          />
          <SummaryCard
            title="Total Items"
            value={summary?.totalItems || 0}
            icon={Package}
            color="amber"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Purchase Trend</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="_id" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Purchases']} />
                  <Bar dataKey="purchases" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Top Suppliers</h3>
            <div className="space-y-3">
              {(topSuppliers || []).slice(0, 5).map((supplier, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-secondary">{supplier.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{supplier.orderCount} orders</p>
                  </div>
                  <p className="font-semibold text-primary">{formatCurrency(supplier.totalPurchased)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderInventoryReport = () => {
    if (!reportData) return null;
    const { summary, stockStatus, byCategory, byWarehouse, lowStockItems, deadStock } = reportData;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Total Products"
            value={summary?.totalProducts || 0}
            icon={Package}
            color="primary"
          />
          <SummaryCard
            title="Total Quantity"
            value={(summary?.totalQuantity || 0).toLocaleString()}
            icon={Activity}
            color="blue"
          />
          <SummaryCard
            title="Cost Value"
            value={formatCurrency(summary?.totalCostValue)}
            icon={IndianRupee}
            color="amber"
          />
          <SummaryCard
            title="Sale Value"
            value={formatCurrency(summary?.totalSaleValue)}
            icon={TrendingUp}
            color="green"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Stock Status */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Stock Status</h3>
            <div className="space-y-4">
              {(stockStatus || []).map((status, index) => {
                const colors = {
                  in_stock: 'bg-green-500',
                  low_stock: 'bg-yellow-500',
                  out_of_stock: 'bg-red-500',
                };
                const total = stockStatus.reduce((sum, s) => sum + s.count, 0);
                const percent = total > 0 ? (status.count / total) * 100 : 0;

                return (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{status._id?.replace('_', ' ')}</span>
                      <span>{status.count} products ({percent.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[status._id] || 'bg-gray-500'} rounded-full`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Category */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Value by Category</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="totalValue"
                    nameKey="_id"
                  >
                    {(byCategory || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Low Stock & Dead Stock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-amber-500" size={20} />
              <h3 className="text-lg font-semibold text-secondary">Low Stock Items</h3>
            </div>
            {(lowStockItems || []).length === 0 ? (
              <p className="text-center text-gray-500 py-8">No low stock items</p>
            ) : (
              <div className="overflow-x-auto max-h-64">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b">
                      <th className="table-header">Product</th>
                      <th className="table-header text-center">Stock</th>
                      <th className="table-header text-center">Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lowStockItems || []).map((item, index) => (
                      <tr key={index} className="border-b border-gray-50">
                        <td className="table-cell">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.sku}</p>
                        </td>
                        <td className="table-cell text-center">
                          <span className={`badge ${item.quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                            {item.quantity}
                          </span>
                        </td>
                        <td className="table-cell text-center text-gray-600">{item.reorderLevel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="text-gray-500" size={20} />
              <h3 className="text-lg font-semibold text-secondary">Dead Stock (No movement in 90 days)</h3>
            </div>
            {(deadStock || []).length === 0 ? (
              <p className="text-center text-gray-500 py-8">No dead stock items</p>
            ) : (
              <div className="overflow-x-auto max-h-64">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b">
                      <th className="table-header">Product</th>
                      <th className="table-header text-center">Stock</th>
                      <th className="table-header text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(deadStock || []).map((item, index) => (
                      <tr key={index} className="border-b border-gray-50">
                        <td className="table-cell">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.sku}</p>
                        </td>
                        <td className="table-cell text-center">{item.quantity}</td>
                        <td className="table-cell text-right">{formatCurrency(item.quantity * item.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderPaymentReport = () => {
    if (!reportData) return null;
    const { summary, byMethod, chequeStatus, outstanding, trend } = reportData;

    const received = summary?.find((s) => s._id === 'received') || { total: 0, count: 0 };
    const made = summary?.find((s) => s._id === 'made') || { total: 0, count: 0 };

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Payments Received"
            value={formatCurrency(received.total)}
            icon={TrendingUp}
            color="green"
          />
          <SummaryCard
            title="Payments Made"
            value={formatCurrency(made.total)}
            icon={TrendingDown}
            color="red"
          />
          <SummaryCard
            title="Outstanding Dues"
            value={formatCurrency(outstanding?.totalOutstanding)}
            icon={AlertTriangle}
            color="amber"
          />
          <SummaryCard
            title="Pending Invoices"
            value={outstanding?.count || 0}
            icon={FileText}
            color="blue"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Payment Methods</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMethod || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="_id" width={100} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="#059669" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Cheque Status</h3>
            <div className="space-y-4">
              {(chequeStatus || []).map((status, index) => {
                const colors = {
                  pending: 'bg-yellow-500',
                  cleared: 'bg-green-500',
                  bounced: 'bg-red-500',
                };
                return (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${colors[status._id] || 'bg-gray-500'}`} />
                      <span className="capitalize font-medium">{status._id}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(status.total)}</p>
                      <p className="text-sm text-gray-500">{status.count} cheques</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderExpiryReport = () => {
    if (!reportData) return null;
    const { summary, expired, expiringIn30, expiringIn60, expiringIn90, byCategory } = reportData;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Expired"
            value={summary?.expired?.count || 0}
            subtitle={formatCurrency(summary?.expired?.value)}
            icon={AlertTriangle}
            color="red"
          />
          <SummaryCard
            title="Expiring in 30 Days"
            value={summary?.expiringIn30?.count || 0}
            subtitle={formatCurrency(summary?.expiringIn30?.value)}
            icon={Clock}
            color="amber"
          />
          <SummaryCard
            title="Expiring in 60 Days"
            value={summary?.expiringIn60?.count || 0}
            subtitle={formatCurrency(summary?.expiringIn60?.value)}
            icon={Clock}
            color="yellow"
          />
          <SummaryCard
            title="Expiring in 90 Days"
            value={summary?.expiringIn90?.count || 0}
            subtitle={formatCurrency(summary?.expiringIn90?.value)}
            icon={Clock}
            color="blue"
          />
        </div>

        {/* Expired Items */}
        {(expired || []).length > 0 && (
          <div className="card p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-500" size={20} />
              <h3 className="text-lg font-semibold text-secondary">Expired Items - Immediate Action Required</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="table-header">Product</th>
                    <th className="table-header">Batch</th>
                    <th className="table-header text-center">Quantity</th>
                    <th className="table-header">Expired On</th>
                  </tr>
                </thead>
                <tbody>
                  {(expired || []).map((batch, index) => (
                    <tr key={index} className="border-b border-gray-50 bg-red-50">
                      <td className="table-cell">
                        <p className="font-medium">{batch.product?.name}</p>
                        <p className="text-xs text-gray-500">{batch.product?.sku}</p>
                      </td>
                      <td className="table-cell">{batch.batchNumber}</td>
                      <td className="table-cell text-center">
                        <span className="badge badge-danger">{batch.currentQuantity}</span>
                      </td>
                      <td className="table-cell text-red-600">
                        {format(new Date(batch.expiryDate), 'dd MMM yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expiring Soon */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-secondary mb-4">Expiring in 30 Days</h3>
          {(expiringIn30 || []).length === 0 ? (
            <p className="text-center text-gray-500 py-8">No items expiring in 30 days</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="table-header">Product</th>
                    <th className="table-header">Batch</th>
                    <th className="table-header text-center">Quantity</th>
                    <th className="table-header">Expiry Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(expiringIn30 || []).map((batch, index) => (
                    <tr key={index} className="border-b border-gray-50">
                      <td className="table-cell">
                        <p className="font-medium">{batch.product?.name}</p>
                        <p className="text-xs text-gray-500">{batch.product?.sku}</p>
                      </td>
                      <td className="table-cell">{batch.batchNumber}</td>
                      <td className="table-cell text-center">{batch.currentQuantity}</td>
                      <td className="table-cell text-amber-600">
                        {format(new Date(batch.expiryDate), 'dd MMM yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderTenderReport = () => {
    if (!reportData) return null;
    const { byStatus, winRate, emdStatus, upcomingDeadlines, byOrganization } = reportData;

    const won = winRate?.find((w) => w._id === 'won') || { count: 0, value: 0 };
    const lost = winRate?.find((w) => w._id === 'lost') || { count: 0, value: 0 };
    const winRatePercent = won.count + lost.count > 0
      ? ((won.count / (won.count + lost.count)) * 100).toFixed(1)
      : 0;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Win Rate"
            value={`${winRatePercent}%`}
            icon={TrendingUp}
            color="green"
          />
          <SummaryCard
            title="Won Value"
            value={formatCurrency(won.value)}
            icon={Gavel}
            color="primary"
          />
          <SummaryCard
            title="Lost Value"
            value={formatCurrency(lost.value)}
            icon={TrendingDown}
            color="red"
          />
          <SummaryCard
            title="Pending EMD"
            value={formatCurrency(emdStatus?.find((e) => e._id === 'submitted')?.totalAmount || 0)}
            icon={IndianRupee}
            color="amber"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Tender by Status */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Tenders by Status</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byStatus || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="count"
                    nameKey="_id"
                  >
                    {(byStatus || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Upcoming Deadlines</h3>
            {(upcomingDeadlines || []).length === 0 ? (
              <p className="text-center text-gray-500 py-8">No upcoming deadlines</p>
            ) : (
              <div className="space-y-3">
                {(upcomingDeadlines || []).map((tender, index) => {
                  const daysLeft = Math.ceil(
                    (new Date(tender.submissionDeadline) - new Date()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-secondary">{tender.title}</p>
                        <p className="text-sm text-gray-500">{tender.tenderNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${daysLeft <= 7 ? 'text-red-500' : 'text-amber-500'}`}>
                          {daysLeft} days left
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(tender.submissionDeadline), 'dd MMM')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderProfitLossReport = () => {
    if (!reportData) return null;
    const { summary, monthlyBreakdown } = reportData;

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Revenue"
            value={formatCurrency(summary?.revenue)}
            icon={TrendingUp}
            color="green"
          />
          <SummaryCard
            title="Cost of Goods"
            value={formatCurrency(summary?.costOfGoods)}
            icon={Package}
            color="blue"
          />
          <SummaryCard
            title="Gross Profit"
            value={formatCurrency(summary?.grossProfit)}
            icon={IndianRupee}
            color="primary"
          />
          <SummaryCard
            title="Gross Margin"
            value={`${summary?.grossMargin || 0}%`}
            icon={TrendingUp}
            color={parseFloat(summary?.grossMargin) >= 20 ? 'green' : 'amber'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Breakdown */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Monthly Revenue</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary Details */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b">
                <span className="text-gray-600">Total Revenue</span>
                <span className="font-semibold text-green-600">{formatCurrency(summary?.revenue)}</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="text-gray-600">(-) Cost of Goods Sold</span>
                <span className="font-semibold text-red-600">{formatCurrency(summary?.costOfGoods)}</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="text-gray-600">(-) Discounts Given</span>
                <span className="font-semibold">{formatCurrency(summary?.discount)}</span>
              </div>
              <div className="flex justify-between py-3 border-b bg-green-50 -mx-6 px-6">
                <span className="font-semibold text-secondary">Gross Profit</span>
                <span className="font-bold text-primary">{formatCurrency(summary?.grossProfit)}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-gray-600">Tax Collected</span>
                <span className="font-semibold">{formatCurrency(summary?.tax)}</span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderMovementReport = () => {
    if (!reportData) return null;
    const { summary, byReason, trend, topMovedProducts, byUser } = reportData;

    const inMovements = summary?.find((s) => s._id === 'in') || { count: 0, totalQuantity: 0 };
    const outMovements = summary?.find((s) => s._id === 'out') || { count: 0, totalQuantity: 0 };

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Stock In"
            value={inMovements.count}
            subtitle={`${inMovements.totalQuantity} units`}
            icon={TrendingUp}
            color="green"
          />
          <SummaryCard
            title="Stock Out"
            value={outMovements.count}
            subtitle={`${outMovements.totalQuantity} units`}
            icon={TrendingDown}
            color="red"
          />
          <SummaryCard
            title="Total Movements"
            value={(inMovements.count + outMovements.count)}
            icon={Activity}
            color="blue"
          />
          <SummaryCard
            title="Net Change"
            value={`${inMovements.totalQuantity - outMovements.totalQuantity > 0 ? '+' : ''}${inMovements.totalQuantity - outMovements.totalQuantity}`}
            icon={Activity}
            color={inMovements.totalQuantity >= outMovements.totalQuantity ? 'green' : 'red'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* By Reason */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Movement Reasons</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byReason || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="_id" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Moved Products */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Most Active Products</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="table-header">Product</th>
                    <th className="table-header text-center">In</th>
                    <th className="table-header text-center">Out</th>
                    <th className="table-header text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(topMovedProducts || []).map((product, index) => (
                    <tr key={index} className="border-b border-gray-50">
                      <td className="table-cell">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sku}</p>
                      </td>
                      <td className="table-cell text-center text-green-600">+{product.totalIn}</td>
                      <td className="table-cell text-center text-red-600">-{product.totalOut}</td>
                      <td className="table-cell text-center font-semibold">{product.totalMovements}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderReport = () => {
    switch (reportType) {
      case 'sales':
        return renderSalesReport();
      case 'purchases':
        return renderPurchaseReport();
      case 'inventory':
        return renderInventoryReport();
      case 'payments':
        return renderPaymentReport();
      case 'movements':
        return renderMovementReport();
      case 'expiry':
        return renderExpiryReport();
      case 'tenders':
        return renderTenderReport();
      case 'profitLoss':
        return renderProfitLossReport();
      default:
        return renderSalesReport();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-secondary">{t('reports.title')}</h1>
          <p className="text-gray-500">{t('reports.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchReportData} className="btn-secondary" disabled={loading}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportReport} className="btn-primary" disabled={!reportData}>
            <Download size={18} className="mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          {REPORT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setReportType(type.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                reportType === type.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <type.icon size={16} />
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      {reportType !== 'inventory' && reportType !== 'expiry' && (
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="input w-40"
              >
                {DATE_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Report Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        renderReport()
      )}
    </div>
  );
};

// Summary Card Component
const SummaryCard = ({ title, value, subtitle, icon: Icon, color }) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-secondary mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

export default Reports;
