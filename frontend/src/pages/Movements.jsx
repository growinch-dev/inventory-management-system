import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Activity,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  ArrowRightLeft,
  Download,
  Filter,
  Calendar,
  Package,
  User,
  Warehouse,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
} from 'lucide-react';
import { movementsAPI, warehousesAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Table,
  LoadingSpinner,
  EmptyState,
  StatCard,
} from '../components/ui';
import { useLanguage } from '../context/LanguageContext';

const Movements = () => {
  const { t } = useLanguage();
  const [movements, setMovements] = useState([]);
  const [stats, setStats] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [showFilters, setShowFilters] = useState(false);

  const movementTypes = [
    { value: 'in', label: t('movements.type.in'), icon: ArrowUpCircle, color: 'success' },
    { value: 'out', label: t('movements.type.out'), icon: ArrowDownCircle, color: 'danger' },
    { value: 'adjustment', label: t('movements.type.adjustment'), icon: RefreshCw, color: 'warning' },
    { value: 'transfer', label: t('movements.type.transfer'), icon: ArrowRightLeft, color: 'info' },
  ];

  const movementReasons = [
    { value: 'purchase', label: t('movements.reason.purchase') },
    { value: 'sale', label: t('movements.reason.sale') },
    { value: 'return', label: t('movements.reason.return') },
    { value: 'damage', label: t('movements.reason.damage') },
    { value: 'expired', label: t('movements.reason.expired') },
    { value: 'adjustment', label: t('movements.reason.adjustment') },
    { value: 'transfer', label: t('movements.reason.transfer') },
    { value: 'initial', label: t('movements.reason.initial') },
  ];

  const [filters, setFilters] = useState({
    search: '',
    type: '',
    reason: '',
    warehouse: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchMovements();
    fetchWarehouses();
    fetchStats();
  }, [pagination.page]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 50,
        ...(filters.type && { type: filters.type }),
        ...(filters.reason && { reason: filters.reason }),
        ...(filters.warehouse && { warehouse: filters.warehouse }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      };
      const response = await movementsAPI.getAll(params);
      setMovements(response.data.data);
      setPagination({
        page: response.data.pagination.page,
        totalPages: response.data.pagination.pages,
        total: response.data.pagination.total,
      });
    } catch (error) {
      toast.error('Failed to load movements');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehousesAPI.getList();
      setWarehouses(response.data.data);
    } catch (error) {
      console.error('Failed to load warehouses');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await movementsAPI.getStats({ days: 30 });
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const handleFilter = () => {
    setPagination({ ...pagination, page: 1 });
    fetchMovements();
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = {
        format: 'csv',
        ...(filters.type && { type: filters.type }),
        ...(filters.reason && { reason: filters.reason }),
        ...(filters.warehouse && { warehouse: filters.warehouse }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      };
      const response = await movementsAPI.export(params);

      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-movements-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Export downloaded successfully');
    } catch (error) {
      toast.error('Failed to export movements');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      type: '',
      reason: '',
      warehouse: '',
      startDate: '',
      endDate: '',
    });
    setPagination({ ...pagination, page: 1 });
    setTimeout(fetchMovements, 0);
  };

  const getTypeConfig = (type) => movementTypes.find(t => t.value === type) || movementTypes[0];
  const getReasonLabel = (reason) => movementReasons.find(r => r.value === reason)?.label || reason;

  const getStatByType = (type) => {
    if (!stats?.byType) return { count: 0, totalQuantity: 0 };
    return stats.byType.find(s => s._id === type) || { count: 0, totalQuantity: 0 };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={t('movements.title')}
        subtitle={t('movements.subtitle')}
        actions={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              icon={Download}
              onClick={handleExport}
              loading={exporting}
            >
              {t('movements.exportCsv')}
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {movementTypes.map(type => {
          const stat = getStatByType(type.value);
          return (
            <StatCard
              key={type.value}
              title={type.label}
              value={stat.count || 0}
              subtitle={`${stat.totalQuantity || 0} units`}
              icon={type.icon}
              iconColor={type.color}
            />
          );
        })}
      </div>

      {/* Filters */}
      <Card padding="md">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1">
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="select w-full sm:w-auto sm:min-w-[140px]"
              >
                <option value="">All Types</option>
                {movementTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>

              <select
                value={filters.reason}
                onChange={(e) => setFilters({ ...filters, reason: e.target.value })}
                className="select w-full sm:w-auto sm:min-w-[140px]"
              >
                <option value="">All Reasons</option>
                {movementReasons.map(reason => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>

              <select
                value={filters.warehouse}
                onChange={(e) => setFilters({ ...filters, warehouse: e.target.value })}
                className="select w-full sm:w-auto sm:min-w-[160px]"
              >
                <option value="">All Warehouses</option>
                {warehouses.map(wh => (
                  <option key={wh._id} value={wh.name}>{wh.name}</option>
                ))}
              </select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              icon={Filter}
            >
              {showFilters ? 'Less Filters' : 'More Filters'}
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-4 pt-4 border-t border-secondary-100">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-secondary-400" />
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="input w-auto"
                  placeholder="Start Date"
                />
                <span className="text-secondary-400">to</span>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="input w-auto"
                  placeholder="End Date"
                />
              </div>

              <div className="flex gap-2 ml-auto">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
                <Button size="sm" onClick={handleFilter}>
                  Apply Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Movements Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <LoadingSpinner.Container className="h-64" />
        ) : movements.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No movements found"
            description={filters.type || filters.reason || filters.warehouse ? "Try different filters" : "Stock movements will appear here when inventory changes"}
            compact
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary-200/60 border-b border-secondary-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-600 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-600 uppercase tracking-wider">Change</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100 bg-white">
                  {movements.map((movement, index) => {
                    const typeConfig = getTypeConfig(movement.type);
                    const TypeIcon = typeConfig.icon;
                    return (
                      <tr
                        key={movement._id}
                        className="hover:bg-secondary-50 transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm font-medium text-secondary">
                            {new Date(movement.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </p>
                          <p className="text-xs text-secondary-400">
                            {new Date(movement.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {movement.product ? (
                            <Link
                              to={`/products/${movement.product._id}/edit`}
                              className="hover:text-primary transition-colors"
                            >
                              <p className="font-medium text-secondary truncate max-w-[200px]">{movement.product.name}</p>
                              <code className="text-xs text-secondary-400">{movement.product.sku}</code>
                            </Link>
                          ) : (
                            <span className="text-secondary-400">Unknown</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={typeConfig.color} size="sm">
                            {typeConfig.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`text-base font-bold tabular-nums ${
                              movement.type === 'in' ? 'text-success' :
                              movement.type === 'out' ? 'text-danger' :
                              'text-secondary'
                            }`}>
                              {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : '±'}
                              {movement.quantity}
                            </span>
                            <span className="text-xs text-secondary-400">
                              {movement.previousQuantity} → {movement.newQuantity}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-secondary-600">
                            {getReasonLabel(movement.reason)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {movement.warehouse && (
                              <p className="text-xs text-secondary-500 truncate max-w-[120px]">
                                📍 {movement.warehouse}
                              </p>
                            )}
                            {movement.performedBy && (
                              <p className="text-xs text-secondary-400">
                                👤 {movement.performedBy.name}
                              </p>
                            )}
                            {/* {movement.reference && (
                              <code className="text-[10px] font-mono text-secondary-400">
                                {movement.reference}
                              </code>
                            )} */}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Table.Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={50}
              onPageChange={(page) => setPagination({ ...pagination, page })}
            />
          </>
        )}
      </Card>

      {/* Recent Activity by User */}
      {stats?.byUser?.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>Top Users (Last 30 Days)</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="flex flex-wrap gap-4">
              {stats.byUser.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 bg-secondary-50 rounded-lg px-4 py-2"
                >
                  <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center">
                    <User size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary">{item.user?.name || 'Unknown'}</p>
                    <p className="text-xs text-secondary-500">{item.count} movements</p>
                  </div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default Movements;
