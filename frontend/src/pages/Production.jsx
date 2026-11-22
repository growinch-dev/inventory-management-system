import { useState, useEffect } from 'react';
import { Plus, Calendar, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { PageHeader, Button, Table, Badge, SearchFilter } from '../components/ui';
import { useNavigate } from 'react-router-dom';

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
      // TODO: Replace with actual API call
      // const response = await productionAPI.getAll();
      // setProductions(response.data.data);

      // Mock data for now
      setProductions([
        {
          _id: '1',
          productionDate: '2026-11-22',
          product: { name: '500ml Bottle', size: '500ml' },
          plannedQuantity: 10000,
          producedQuantity: 9850,
          rejectedQuantity: 150,
          goodQuantity: 9700,
          shift: 'Day',
          status: 'completed',
        },
      ]);
    } catch (error) {
      console.error('Error fetching productions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'success',
      inProgress: 'warning',
      cancelled: 'danger',
    };
    return <Badge variant={variants[status] || 'gray'}>{status}</Badge>;
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
              <p className="text-sm text-secondary-500">Today's Production</p>
              <p className="text-2xl font-bold text-secondary">9,700</p>
            </div>
            <Package className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-secondary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500">Rejection Rate</p>
              <p className="text-2xl font-bold text-warning">1.5%</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-secondary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500">This Week</p>
              <p className="text-2xl font-bold text-secondary">67,850</p>
            </div>
            <Calendar className="w-8 h-8 text-info" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-secondary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500">Efficiency</p>
              <p className="text-2xl font-bold text-success">97%</p>
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
