import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Package,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Edit2,
  Trash2,
  Send,
  RotateCcw,
  Filter,
  CalendarClock,
} from 'lucide-react';
import { demoIssuesAPI } from '../services/api';
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
import { format, formatDistanceToNow } from 'date-fns';

const demoStatuses = [
  { value: 'draft', label: 'Draft', color: 'gray', icon: Clock },
  { value: 'issued', label: 'Issued', color: 'info', icon: Send },
  { value: 'partial_return', label: 'Partial Return', color: 'warning', icon: RotateCcw },
  { value: 'returned', label: 'Returned', color: 'success', icon: CheckCircle2 },
  { value: 'overdue', label: 'Overdue', color: 'danger', icon: AlertTriangle },
  { value: 'cancelled', label: 'Cancelled', color: 'gray', icon: XCircle },
];

const purposeLabels = {
  demo: 'Demo',
  trial: 'Trial',
  evaluation: 'Evaluation',
  training: 'Training',
  exhibition: 'Exhibition',
  loan: 'Loan',
  other: 'Other',
};

const DemoIssues = () => {
  const navigate = useNavigate();
  const [demoIssues, setDemoIssues] = useState([]);
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
    overdue: '',
  });

  useEffect(() => {
    fetchDemoIssues();
    fetchStats();
  }, [pagination.page, filters.status, filters.overdue]);

  const fetchDemoIssues = async () => {
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

      const response = await demoIssuesAPI.getAll(params);
      if (response.data.success) {
        setDemoIssues(response.data.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
          totalPages: response.data.totalPages,
        }));
      }
    } catch (error) {
      console.error('Error fetching demo issues:', error);
      toast.error('Failed to fetch demo issues');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await demoIssuesAPI.getStats();
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
    fetchDemoIssues();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this demo issue?')) return;

    try {
      await demoIssuesAPI.delete(id);
      toast.success('Demo issue deleted successfully');
      fetchDemoIssues();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete demo issue');
    }
  };

  const getStatusBadge = (status) => {
    const statusInfo = demoStatuses.find(s => s.value === status);
    if (!statusInfo) return <Badge>{status}</Badge>;

    const Icon = statusInfo.icon;
    return (
      <Badge color={statusInfo.color} className="inline-flex items-center gap-1">
        <Icon size={12} />
        {statusInfo.label}
      </Badge>
    );
  };

  const columns = [
    {
      header: 'Issue #',
      accessorKey: 'issueNumber',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-secondary">{row.original.issueNumber}</p>
          <p className="text-xs text-secondary-500 capitalize">{purposeLabels[row.original.purpose]}</p>
        </div>
      ),
    },
    {
      header: 'Hospital',
      accessorKey: 'hospital.name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-secondary-400" />
          <div>
            <p className="text-sm font-medium">{row.original.hospital?.name || '-'}</p>
            {row.original.hospital?.city && (
              <p className="text-xs text-secondary-500">{row.original.hospital.city}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Items',
      accessorKey: 'items',
      cell: ({ row }) => {
        const total = row.original.totalItems || row.original.items?.reduce((s, i) => s + i.quantity, 0) || 0;
        const returned = row.original.totalReturned || row.original.items?.reduce((s, i) => s + (i.returnedQuantity || 0), 0) || 0;
        return (
          <div className="text-center">
            <p className="font-medium">{returned} / {total}</p>
            <p className="text-xs text-secondary-500">Returned</p>
          </div>
        );
      },
    },
    {
      header: 'Issue Date',
      accessorKey: 'issueDate',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <Calendar size={14} className="text-secondary-400" />
          {row.original.issueDate ? format(new Date(row.original.issueDate), 'dd MMM yyyy') : '-'}
        </div>
      ),
    },
    {
      header: 'Expected Return',
      accessorKey: 'expectedReturnDate',
      cell: ({ row }) => {
        const date = row.original.expectedReturnDate;
        if (!date) return '-';

        const returnDate = new Date(date);
        const now = new Date();
        const isOverdue = returnDate < now && !['returned', 'cancelled'].includes(row.original.status);
        const isDueSoon = !isOverdue && returnDate < new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        return (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-500' : ''}`}>
            <CalendarClock size={14} />
            <div>
              <p className="text-sm">{format(returnDate, 'dd MMM yyyy')}</p>
              {isOverdue && (
                <p className="text-xs">Overdue by {formatDistanceToNow(returnDate)}</p>
              )}
              {isDueSoon && !isOverdue && (
                <p className="text-xs">Due in {formatDistanceToNow(returnDate)}</p>
              )}
            </div>
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
      header: '',
      accessorKey: 'actions',
      cell: ({ row }) => (
        <ActionMenu
          items={[
            {
              label: 'View Details',
              icon: Eye,
              onClick: () => navigate(`/demo-issues/${row.original._id}`),
            },
            {
              label: 'Edit',
              icon: Edit2,
              onClick: () => navigate(`/demo-issues/${row.original._id}/edit`),
            },
            ...(row.original.status === 'draft' ? [{
              label: 'Delete',
              icon: Trash2,
              onClick: () => handleDelete(row.original._id),
              danger: true,
            }] : []),
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Demo Instruments"
        subtitle="Track demo equipment issued to hospitals"
        actions={
          <Button onClick={() => navigate('/demo-issues/new')} icon={Plus}>
            New Demo Issue
          </Button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Active Issues"
            value={stats.totals?.active || 0}
            icon={Package}
            color="primary"
          />
          <StatCard
            title="Returned"
            value={stats.totals?.returned || 0}
            icon={CheckCircle2}
            color="success"
          />
          <StatCard
            title="Overdue"
            value={stats.overdue || 0}
            icon={AlertTriangle}
            color="danger"
          />
          <StatCard
            title="Due in 7 Days"
            value={stats.dueSoon || 0}
            icon={CalendarClock}
            color="warning"
          />
        </div>
      )}

      {/* Overdue Alert */}
      {stats && stats.overdue > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <AlertTriangle size={18} />
          <span className="text-sm font-medium">
            {stats.overdue} demo issue(s) are overdue and require immediate attention!
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilters(prev => ({ ...prev, overdue: 'true' }));
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="ml-auto text-red-700"
          >
            View Overdue
          </Button>
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
                  placeholder="Search by issue number, hospital..."
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, status: e.target.value, overdue: '' }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="select min-w-[150px]"
            >
              <option value="">All Status</option>
              {demoStatuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
            <Button type="submit" icon={Filter}>
              Search
            </Button>
          </form>
        </Card.Content>
      </Card>

      {/* Demo Issues Table */}
      <Card>
        <Card.Content className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : demoIssues.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No demo issues found"
              description="Get started by creating your first demo issue"
              action={
                <Button onClick={() => navigate('/demo-issues/new')} icon={Plus}>
                  Create Demo Issue
                </Button>
              }
            />
          ) : (
            <Table
              data={demoIssues}
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

export default DemoIssues;
