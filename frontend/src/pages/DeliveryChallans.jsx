import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Truck,
  Package,
  RotateCcw,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { deliveryChallansAPI } from '../services/api';
import { Button, Input, Card, Badge, LoadingSpinner, Select } from '../components/ui';
import toast from 'react-hot-toast';

const challanTypeLabels = {
  demo: 'Demo',
  approval: 'Approval',
  job_work: 'Job Work',
  returnable: 'Returnable',
  non_returnable: 'Non-Returnable',
  sample: 'Sample',
  credit: 'Credit',
};

const statusColors = {
  draft: 'secondary',
  dispatched: 'primary',
  in_transit: 'warning',
  delivered: 'success',
  partial_return: 'warning',
  returned: 'info',
  converted: 'success',
  cancelled: 'danger',
};

const DeliveryChallans = () => {
  const navigate = useNavigate();
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    challanType: '',
    returnStatus: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchChallans();
    fetchStats();
  }, [pagination.page, filters]);

  const fetchChallans = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        ),
      };
      const { data } = await deliveryChallansAPI.getAll(params);
      setChallans(data.data);
      setPagination(prev => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages,
      }));
    } catch (error) {
      toast.error('Failed to fetch delivery challans');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await deliveryChallansAPI.getStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getOverdueCount = () => {
    return stats?.overdueReturns?.[0]?.count || 0;
  };

  const getPendingReturnsCount = () => {
    return stats?.pendingReturns?.[0]?.count || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Delivery Challans</h1>
          <p className="text-secondary-500 mt-1">
            Manage delivery challans for demo, approval, and credit deliveries
          </p>
        </div>
        <Button onClick={() => navigate('/delivery-challans/new')}>
          <Plus size={20} className="mr-2" />
          New Challan
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-50 rounded-xl">
              <FileText size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">This Month</p>
              <p className="text-xl font-bold text-secondary">
                {stats?.thisMonth?.[0]?.count || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-warning-light rounded-xl">
              <RotateCcw size={20} className="text-warning" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">Pending Returns</p>
              <p className="text-xl font-bold text-secondary">
                {getPendingReturnsCount()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-danger-light rounded-xl">
              <AlertTriangle size={20} className="text-danger" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">Overdue Returns</p>
              <p className="text-xl font-bold text-danger">
                {getOverdueCount()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-success-light rounded-xl">
              <Truck size={20} className="text-success" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">Dispatched</p>
              <p className="text-xl font-bold text-secondary">
                {stats?.byStatus?.find(s => s._id === 'dispatched')?.count || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Overdue Alert */}
      {getOverdueCount() > 0 && (
        <Card className="p-4 bg-danger-light border-danger/20">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-danger" />
            <p className="text-danger font-medium">
              {getOverdueCount()} delivery challan(s) have overdue returns!
            </p>
            <Link
              to="/delivery-challans?returnStatus=pending"
              className="ml-auto text-sm text-danger underline"
            >
              View All
            </Link>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by challan number, consignee..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              icon={Search}
            />
          </div>
          <Select
            value={filters.challanType}
            onChange={(e) => handleFilterChange('challanType', e.target.value)}
            className="w-full md:w-40"
          >
            <option value="">All Types</option>
            {Object.entries(challanTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <Select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full md:w-40"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="partial_return">Partial Return</option>
            <option value="returned">Returned</option>
            <option value="converted">Converted</option>
          </Select>
          <Select
            value={filters.returnStatus}
            onChange={(e) => handleFilterChange('returnStatus', e.target.value)}
            className="w-full md:w-40"
          >
            <option value="">Return Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="complete">Complete</option>
          </Select>
        </div>
      </Card>

      {/* Challans Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : challans.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-secondary-300 mb-4" />
            <p className="text-secondary-500">No delivery challans found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/delivery-challans/new')}
            >
              Create First Challan
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-secondary-50 border-b border-secondary-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                      Challan No
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                      Consignee
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                      Items
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                      Value
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                      Return Due
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-secondary-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {challans.map((challan) => (
                    <tr key={challan._id} className="hover:bg-secondary-50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/delivery-challans/${challan._id}`}
                          className="font-medium text-primary hover:underline whitespace-nowrap"
                        >
                          {challan.challanNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" size="sm">
                          {challanTypeLabels[challan.challanType] || challan.challanType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-secondary">
                            {challan.consignee?.name}
                          </p>
                          <p className="text-sm text-secondary-500">
                            {challan.consignee?.city}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-secondary-600">
                        {formatDate(challan.challanDate)}
                      </td>
                      <td className="px-4 py-3 text-secondary-600">
                        {challan.totalQuantity} items
                      </td>
                      <td className="px-4 py-3 font-medium text-secondary">
                        {formatCurrency(challan.totalValue)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusColors[challan.status]} size="sm">
                          {challan.status?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {challan.expectedReturnDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-secondary-400" />
                            <span
                              className={
                                challan.isOverdue
                                  ? 'text-danger font-medium'
                                  : 'text-secondary-600'
                              }
                            >
                              {formatDate(challan.expectedReturnDate)}
                            </span>
                            {challan.isOverdue && (
                              <AlertTriangle size={14} className="text-danger" />
                            )}
                          </div>
                        ) : (
                          <span className="text-secondary-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/delivery-challans/${challan._id}`)}
                        >
                          <Eye size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-secondary-100">
                <p className="text-sm text-secondary-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                    }
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="text-sm text-secondary-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                    disabled={pagination.page === pagination.totalPages}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default DeliveryChallans;
