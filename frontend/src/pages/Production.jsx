import { useState, useEffect } from 'react';
import { Plus, Calendar, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { PageHeader, Button, Table, Badge, SearchFilter } from '../components/ui';
import { productionAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Production = () => {
  const navigate = useNavigate();
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProductions();
  }, []);

  const fetchProductions = async () => {
    try {
      setLoading(true);
      const response = await productionAPI.getAll({ limit: 100 });
      const data = (response.data.data || []).map((p) => ({
        _id: p._id,
        productionDate: p.productionDate,
        product: {
          name: p.product?.name || '—',
          size: p.product?.bottleSize?.size
            ? `${p.product.bottleSize.size}${p.product.bottleSize.unit}`
            : (p.batchNumber || ''),
        },
        plannedQuantity: p.plannedQuantity || 0,
        producedQuantity: p.producedQuantity || 0,
        rejectedQuantity: p.rejectedQuantity || 0,
        goodQuantity: p.goodQuantity || 0,
        shift: p.shift,
        status: p.status,
      }));
      setProductions(data);
    } catch (error) {
      console.error('Error fetching productions:', error);
      toast.error('Failed to load production entries');
      setProductions([]);
    } finally {
      setLoading(false);
    }
  };

  // Live figures from the loaded entries (cancelled/planned runs excluded).
  const stats = (() => {
    const done = productions.filter((p) => p.status === 'completed' || p.status === 'in_progress');
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - 6);
    const sum = (rows, k) => rows.reduce((t, p) => t + (p[k] || 0), 0);
    const today = done.filter((p) => new Date(p.productionDate) >= startOfToday);
    const week = done.filter((p) => new Date(p.productionDate) >= startOfWeek);
    const produced = sum(week, 'producedQuantity');
    const planned = sum(week, 'plannedQuantity');
    return {
      today: sum(today, 'goodQuantity'),
      week: sum(week, 'goodQuantity'),
      rejection: produced ? (sum(week, 'rejectedQuantity') / produced) * 100 : 0,
      efficiency: planned ? (sum(week, 'goodQuantity') / planned) * 100 : 0,
    };
  })();
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'success',
      in_progress: 'warning',
      inProgress: 'warning',
      planned: 'info',
      cancelled: 'danger',
    };
    const labels = {
      in_progress: 'In Progress',
      inProgress: 'In Progress',
    };
    return <Badge variant={variants[status] || 'gray'}>{labels[status] || status}</Badge>;
  };

  const columns = [
    {
      key: 'productionDate',
      label: 'Date',
      render: (row) => new Date(row.productionDate).toLocaleDateString('en-IN'),
    },
    {
      key: 'product',
      label: 'Product',
      render: (row) => (
        <div>
          <div className="font-medium">{row.product.name}</div>
          <div className="text-sm text-secondary-500">{row.product.size}</div>
        </div>
      ),
    },
    {
      key: 'shift',
      label: 'Shift',
    },
    {
      key: 'plannedQuantity',
      label: 'Planned Qty',
      render: (row) => row.plannedQuantity.toLocaleString(),
    },
    {
      key: 'producedQuantity',
      label: 'Produced',
      render: (row) => row.producedQuantity.toLocaleString(),
    },
    {
      key: 'goodQuantity',
      label: 'Good Qty',
      render: (row) => (
        <span className="text-success font-medium">
          {row.goodQuantity.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'rejectedQuantity',
      label: 'Rejected',
      render: (row) => (
        <span className="text-danger font-medium">
          {row.rejectedQuantity.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => getStatusBadge(row.status),
    },
  ];

  const filteredProductions = productions.filter((production) =>
    production.product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Entry"
        description="Record daily production and material consumption"
      >
        <Button
          onClick={() => navigate('/production/new')}
          icon={Plus}
        >
          New Production Entry
        </Button>
      </PageHeader>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-secondary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500">Good units today</p>
              <p className="text-2xl font-bold text-secondary">{fmt(stats.today)}</p>
            </div>
            <Package className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-secondary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500">Rejection rate (7 days)</p>
              <p className="text-2xl font-bold text-warning">{stats.rejection.toFixed(1)}%</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-secondary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500">Good units (7 days)</p>
              <p className="text-2xl font-bold text-secondary">{fmt(stats.week)}</p>
            </div>
            <Calendar className="w-8 h-8 text-info" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-secondary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500">Plan achieved (7 days)</p>
              <p className="text-2xl font-bold text-success">{stats.efficiency.toFixed(0)}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
        </div>
      </div>

      {/* Production List */}
      <div className="bg-white rounded-lg border border-secondary-200">
        <div className="p-4 border-b border-secondary-200">
          <SearchFilter
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by product..."
          />
        </div>

        <Table
          columns={columns}
          data={filteredProductions}
          loading={loading}
          emptyMessage="No production entries found"
          onRowClick={(row) => navigate(`/production/${row._id}`)}
        />
      </div>
    </div>
  );
};

export default Production;
