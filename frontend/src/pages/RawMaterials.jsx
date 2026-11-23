import { useState, useEffect } from 'react';
import { Plus, Package, AlertTriangle, Edit, Trash2, Building2, ExternalLink } from 'lucide-react';
import { PageHeader, Button, Table, Badge, SearchFilter, Modal, Input, Select, Textarea } from '../components/ui';
import { customersAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const RawMaterials = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    vendor: '',
    unit: 'Pieces',
    minimumStock: '',
    currentStock: '',
    description: '',
  });

  useEffect(() => {
    fetchMaterials();
    fetchVendors();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await rawMaterialsAPI.getAll();
      // setMaterials(response.data.data);

      // Mock data
      setMaterials([
        { _id: '1', name: 'PET Preform 500ml', vendor: { _id: 'v1', name: 'Plastic Supplies Co.' }, unit: 'Pieces', currentStock: 50000, minimumStock: 10000, status: 'sufficient' },
        { _id: '2', name: 'PET Preform 1L', vendor: { _id: 'v1', name: 'Plastic Supplies Co.' }, unit: 'Pieces', currentStock: 30000, minimumStock: 10000, status: 'sufficient' },
        { _id: '3', name: 'Bottle Cap', vendor: { _id: 'v2', name: 'Cap Industries Ltd.' }, unit: 'Pieces', currentStock: 8000, minimumStock: 20000, status: 'low' },
        { _id: '4', name: 'Label Roll', vendor: { _id: 'v3', name: 'Print Tech Solutions' }, unit: 'Rolls', currentStock: 50, minimumStock: 20, status: 'sufficient' },
        { _id: '5', name: 'Shrink Film', vendor: { _id: 'v4', name: 'Packaging Materials Inc.' }, unit: 'KG', currentStock: 150, minimumStock: 200, status: 'low' },
        { _id: '6', name: 'Carton Box', vendor: { _id: 'v4', name: 'Packaging Materials Inc.' }, unit: 'Pieces', currentStock: 2000, minimumStock: 500, status: 'sufficient' },
      ]);
    } catch (error) {
      toast.error('Failed to fetch raw materials');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await customersAPI.getAll({ limit: 100 });
      setVendors(response.data.data || []);
    } catch (error) {
      console.error('Failed to load vendors');
    }
  };

  const handleAdd = () => {
    setEditingMaterial(null);
    setFormData({
      name: '',
      vendor: '',
      unit: 'Pieces',
      minimumStock: '',
      currentStock: '',
      description: '',
    });
    setModalOpen(true);
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      vendor: material.vendor?._id || '',
      unit: material.unit,
      minimumStock: material.minimumStock,
      currentStock: material.currentStock,
      description: material.description || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this raw material?')) return;

    try {
      // TODO: Replace with actual API call
      // await rawMaterialsAPI.delete(id);
      toast.success('Raw material deleted successfully');
      fetchMaterials();
    } catch (error) {
      toast.error('Failed to delete raw material');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // TODO: Replace with actual API call
      // if (editingMaterial) {
      //   await rawMaterialsAPI.update(editingMaterial._id, formData);
      // } else {
      //   await rawMaterialsAPI.create(formData);
      // }

      toast.success(editingMaterial ? 'Raw material updated successfully' : 'Raw material added successfully');
      setModalOpen(false);
      fetchMaterials();
    } catch (error) {
      toast.error('Failed to save raw material');
    }
  };

  const handleAddVendor = () => {
    // Open vendors page in a new tab
    window.open('/vendors', '_blank');
  };

  const getStockBadge = (status) => {
    if (status === 'low') {
      return <Badge variant="warning" icon={AlertTriangle}>Low Stock</Badge>;
    }
    return <Badge variant="success">Sufficient</Badge>;
  };

  const columns = [
    {
      key: 'name',
      label: 'Material Name',
      render: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
        </div>
      ),
    },
    {
      key: 'vendor',
      label: 'Vendor',
      render: (row) => (
        <div>
          <div className="font-medium">{row.vendor?.name || '-'}</div>
        </div>
      ),
    },
    {
      key: 'currentStock',
      label: 'Current Stock',
      render: (row) => (
        <div>
          <div className="font-semibold">{row.currentStock.toLocaleString()} {row.unit}</div>
          <div className="text-xs text-secondary-500">
            Min: {row.minimumStock.toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      key: 'unit',
      label: 'Unit',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => getStockBadge(row.status),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEdit(row)}
            icon={Edit}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDelete(row._id)}
            icon={Trash2}
            className="text-danger hover:bg-danger-light"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const filteredMaterials = materials.filter((material) =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = materials.filter((m) => m.status === 'low').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raw Materials"
        description="Manage raw materials inventory"
      >
        <Button onClick={handleAdd} icon={Plus}>
          Add Raw Material
        </Button>
      </PageHeader>

      {/* Alert for low stock */}
      {lowStockCount > 0 && (
        <div className="bg-warning-light border border-warning rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-warning-dark">Low Stock Alert</p>
            <p className="text-sm text-warning-dark">
              {lowStockCount} material(s) are below minimum stock level. Please reorder soon.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-secondary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500">Total Materials</p>
              <p className="text-2xl font-bold text-secondary">{materials.length}</p>
            </div>
            <Package className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-secondary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500">Low Stock Items</p>
              <p className="text-2xl font-bold text-warning">{lowStockCount}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-secondary-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500">Sufficient Stock</p>
              <p className="text-2xl font-bold text-success">{materials.length - lowStockCount}</p>
            </div>
            <Package className="w-8 h-8 text-success" />
          </div>
        </div>
      </div>

      {/* Materials List */}
      <div className="bg-white rounded-lg border border-secondary-200">
        <div className="p-4 border-b border-secondary-200">
          <SearchFilter
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search raw materials..."
          />
        </div>

        <Table
          columns={columns}
          data={filteredMaterials}
          loading={loading}
          emptyMessage="No raw materials found"
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMaterial ? 'Edit Raw Material' : 'Add Raw Material'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Material Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., PET Preform 500ml"
            required
          />

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Vendor <span className="text-danger">*</span>
            </label>
            <div className="flex gap-2">
              <Select
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                options={[
                  { value: '', label: 'Select Vendor' },
                  ...vendors.map((vendor) => ({
                    value: vendor._id,
                    label: vendor.name,
                  })),
                ]}
                required
                className="flex-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Unit of Measure"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              options={[
                { value: 'Pieces', label: 'Pieces' },
                { value: 'KG', label: 'Kilograms' },
                { value: 'Liters', label: 'Liters' },
                { value: 'Rolls', label: 'Rolls' },
                { value: 'Cartons', label: 'Cartons' },
              ]}
              required
            />

            <Input
              label="Minimum Stock Level"
              type="number"
              value={formData.minimumStock}
              onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
              required
            />
          </div>

          <Input
            label="Current Stock"
            type="number"
            value={formData.currentStock}
            onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
            helperText="Opening balance or current available stock"
            required
          />

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingMaterial ? 'Update' : 'Add'} Material
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RawMaterials;
