import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  Calendar,
  Building2,
  IndianRupee,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Edit2,
  Trash2,
  TrendingUp,
  Shield,
  Banknote,
  Package,
  Filter,
} from 'lucide-react';
import { tendersAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Table,
  ActionMenu,
  LoadingSpinner,
  EmptyState,
  StatCard,
} from '../components/ui';
import { format } from 'date-fns';

const tenderStatuses = [
  { value: 'draft', label: 'Draft', color: 'gray', icon: Clock },
  { value: 'submitted', label: 'Submitted', color: 'info', icon: FileText },
  { value: 'technical_evaluation', label: 'Tech Eval', color: 'warning', icon: Search },
  { value: 'financial_evaluation', label: 'Fin Eval', color: 'warning', icon: IndianRupee },
  { value: 'awarded', label: 'Awarded', color: 'success', icon: CheckCircle2 },
  { value: 'loa_received', label: 'LOA Received', color: 'success', icon: FileText },
  { value: 'po_received', label: 'PO Received', color: 'success', icon: Package },
  { value: 'in_progress', label: 'In Progress', color: 'info', icon: TrendingUp },
  { value: 'completed', label: 'Completed', color: 'success', icon: CheckCircle2 },
  { value: 'cancelled', label: 'Cancelled', color: 'danger', icon: XCircle },
  { value: 'lost', label: 'Lost', color: 'danger', icon: XCircle },
];

const priorityColors = {
  low: 'gray',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

const Tenders = () => {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
  });

  useEffect(() => {
    fetchTenders();
    fetchStats();
  }, [pagination.page, filters.status, filters.priority]);

  const fetchTenders = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };

      // Remove empty params
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await tendersAPI.getAll(params);
      if (response.data.success) {
        setTenders(response.data.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
          totalPages: response.data.totalPages,
        }));
      }
    } catch (error) {
      console.error('Error fetching tenders:', error);
      toast.error('Failed to fetch tenders');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await tendersAPI.getStats();
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchTenders();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tender?')) return;

    try {
      await tendersAPI.delete(id);
      toast.success('Tender deleted successfully');
      fetchTenders();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete tender');
    }
  };

  const getStatusBadge = (status) => {
    const statusInfo = tenderStatuses.find(s => s.value === status);
    if (!statusInfo) return <Badge>{status}</Badge>;

    const Icon = statusInfo.icon;
    return (
      <Badge color={statusInfo.color} className="inline-flex items-center gap-1">
        <Icon size={12} />
        {statusInfo.label}
      </Badge>
    );
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const columns = [
    {
      header: 'Tender',
      accessorKey: 'tenderNumber',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-secondary">{row.original.tenderNumber}</p>
          <p className="text-xs text-secondary-500 line-clamp-1">{row.original.title}</p>
        </div>
      ),
    },
    {
      header: 'Organization',
      accessorKey: 'organization.name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-secondary-400" />
          <span className="text-sm">{row.original.organization?.name || '-'}</span>
        </div>
      ),
    },
    {
      header: 'Value',
      accessorKey: 'quotedValue',
      cell: ({ row }) => (
        <div className="text-right">
          <p className="font-semibold text-secondary">{formatCurrency(row.original.quotedValue)}</p>
          {row.original.finalValue && row.original.finalValue !== row.original.quotedValue && (
            <p className="text-xs text-green-600">Final: {formatCurrency(row.original.finalValue)}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Deadline',
      accessorKey: 'submissionDeadline',
      cell: ({ row }) => {
        const deadline = row.original.submissionDeadline;
        if (!deadline) return '-';

        const date = new Date(deadline);
        const isPast = date < new Date();
        const isNear = !isPast && date < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        return (
          <div className={`flex items-center gap-1 ${isPast ? 'text-red-500' : isNear ? 'text-orange-500' : ''}`}>
            <Calendar size={14} />
            <span className="text-sm">{format(date, 'dd MMM yyyy')}</span>
          </div>
        );
      },
    },
    {
      header: 'EMD',
      accessorKey: 'emd',
      cell: ({ row }) => {
        const emd = row.original.emd;
        if (!emd?.amount) return <span className="text-secondary-400">-</span>;

        const statusColors = {
          pending: 'warning',
          submitted: 'info',
          refunded: 'success',
          forfeited: 'danger',
          exempted: 'gray',
        };

        return (
          <div>
            <p className="text-sm font-medium">{formatCurrency(emd.amount)}</p>
            <Badge color={statusColors[emd.status] || 'gray'} size="sm">
              {emd.status}
            </Badge>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      header: 'Priority',
      accessorKey: 'priority',
      cell: ({ row }) => (
        <Badge color={priorityColors[row.original.priority] || 'gray'}>
          {row.original.priority}
        </Badge>
      ),
    },
    {
      header: '',
      accessorKey: 'actions',
      cell: ({ row }) => (
        <ActionMenu
          items={[
            {
              label: 'View Details',
              icon: Eye,
              onClick: () => navigate(`/tenders/${row.original._id}`),
            },
            {
              label: 'Edit',
              icon: Edit2,
              onClick: () => navigate(`/tenders/${row.original._id}/edit`),
            },
            {
              label: 'Delete',
              icon: Trash2,
              onClick: () => handleDelete(row.original._id),
              danger: true,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Tender Management"
        subtitle="Track tenders, EMD, and supply orders"
        actions={
          <Button onClick={() => navigate('/tenders/new')} icon={Plus}>
            New Tender
          </Button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Tenders"
            value={stats.totals?.totalTenders || 0}
            icon={FileText}
            color="primary"
          />
          <StatCard
            title="Won Value"
            value={formatCurrency(stats.totals?.wonValue || 0)}
            icon={TrendingUp}
            color="success"
          />
          <StatCard
            title="EMD Pending"
            value={formatCurrency(stats.emdPending?.totalAmount || 0)}
            subtitle={`${stats.emdPending?.count || 0} tenders`}
            icon={Banknote}
            color="warning"
          />
          <StatCard
            title="SD Pending"
            value={formatCurrency(stats.sdPending?.totalAmount || 0)}
            subtitle={`${stats.sdPending?.count || 0} tenders`}
            icon={Shield}
            color="info"
          />
        </div>
      )}

      {/* Alerts */}
      {stats && (stats.upcomingDeadlines > 0 || stats.pendingSupply > 0) && (
        <div className="flex gap-4">
          {stats.upcomingDeadlines > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">
                {stats.upcomingDeadlines} tender(s) with deadline in next 7 days
              </span>
            </div>
          )}
          {stats.pendingSupply > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
              <Package size={16} />
              <span className="text-sm font-medium">
                {stats.pendingSupply} item(s) pending supply
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <Card>
        <Card.Content className="p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search by tender number, title, organization..."
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, status: e.target.value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="select min-w-[150px]"
            >
              <option value="">All Status</option>
              {tenderStatuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
            <select
              value={filters.priority}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, priority: e.target.value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="select min-w-[120px]"
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <Button type="submit" icon={Filter}>
              Search
            </Button>
          </form>
        </Card.Content>
      </Card>

      {/* Tenders Table */}
      <Card>
        <Card.Content className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : tenders.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No tenders found"
              description="Get started by creating your first tender"
              action={
                <Button onClick={() => navigate('/tenders/new')} icon={Plus}>
                  Create Tender
                </Button>
              }
            />
          ) : (
            <Table
              data={tenders}
              columns={columns}
              pagination={{
                currentPage: pagination.page,
                totalPages: pagination.totalPages,
                onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
              }}
            />
          )}
        </Card.Content>
      </Card>
    </div>
  );
};

export default Tenders;
