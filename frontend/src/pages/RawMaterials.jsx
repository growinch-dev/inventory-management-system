import { useState, useEffect } from 'react';
import { Plus, Package, AlertTriangle, Edit, Trash2, X } from 'lucide-react';
import { PageHeader, Button, Table, Badge, SearchFilter, Modal, Input, Select } from '../components/ui';
import { productsAPI, suppliersAPI } from '../services/api';
import toast from 'react-hot-toast';

// Form unit options mapped to the Product model's unit enum.
const UNIT_OPTIONS = [
  { value: 'PCS', label: 'Pieces' },
  { value: 'KG', label: 'Kilograms' },
  { value: 'LTR', label: 'Liters' },
  { value: 'ROLL', label: 'Rolls' },
  { value: 'CARTON', label: 'Cartons' },
  { value: 'BOX', label: 'Box' },
  { value: 'BAG', label: 'Bag' },
];

const RM_CATEGORIES = [
  { value: 'raw_material_bottles', label: 'Bottles / Preforms' },
  { value: 'raw_material_caps', label: 'Caps & Closures' },
  { value: 'raw_material_labels', label: 'Labels' },
  { value: 'raw_material_packaging', label: 'Packaging (cartons, film)' },
  { value: 'raw_material_chemicals', label: 'Chemicals' },
  { value: 'raw_material_filters', label: 'Filters' },
];

const emptyForm = {
  name: '',
  category: 'raw_material_packaging',
  vendor: '',
  unit: 'PCS',
  minimumStock: '',
  currentStock: '',
  description: '',
};

const RawMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'low' | 'sufficient'
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchMaterials();
    fetchVendors();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll({ productType: 'raw_material', limit: 500 });
      const rows = (response.data.data || []).map((p) => {
        const currentStock = p.quantity ?? 0;
        const minimumStock = p.reorderLevel ?? 0;
        return {
          _id: p._id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          vendor: p.supplier || null,
          unit: p.unit || 'PCS',
          currentStock,
          minimumStock,
          status: currentStock <= minimumStock ? 'low' : 'sufficient',
        };
      });
      setMaterials(rows);
    } catch (error) {
      toast.error('Failed to fetch raw materials');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await suppliersAPI.getAll({ limit: 200 });
      setVendors(response.data.data || []);
    } catch (error) {
      console.error('Failed to load vendors');
    }
  };

  const handleAdd = () => {
    setEditingMaterial(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      category: material.category || 'raw_material_packaging',
      vendor: material.vendor?._id || '',
      unit: material.unit || 'PCS',
      minimumStock: material.minimumStock,
      currentStock: material.currentStock,
      description: material.description || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this raw material?')) return;
    try {
      await productsAPI.delete(id);
      toast.success('Raw material deleted successfully');
      fetchMaterials();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete raw material');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        category: formData.category,
        productType: 'raw_material',
        unit: formData.unit,
        quantity: Number(formData.currentStock) || 0,
        reorderLevel: Number(formData.minimumStock) || 0,
        description: formData.description,
        ...(formData.vendor ? { supplier: formData.vendor } : {}),
      };
      if (editingMaterial) {
        await productsAPI.update(editingMaterial._id, payload);
        toast.success('Raw material updated successfully');
      } else {
        payload.sku = `RM-${Date.now().toString(36).toUpperCase()}`;
        payload.unitPrice = 0;
        await productsAPI.create(payload);
        toast.success('Raw material added successfully');
      }
      setModalOpen(false);
      fetchMaterials();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save raw material');
    } finally {
      setSaving(false);
    }
  };

  const getStockBadge = (status) =>
    status === 'low' ? (
      <Badge variant="warning" icon={AlertTriangle}>Low Stock</Badge>
    ) : (
      <Badge variant="success">Sufficient</Badge>
    );

  const columns = [
    { key: 'name', label: 'Material Name', render: (row) => <div className="font-medium">{row.name}</div> },
    { key: 'vendor', label: 'Vendor', render: (row) => <div>{row.vendor?.name || '-'}</div> },
    {
      key: 'currentStock',
      label: 'Current Stock',
      render: (row) => (
        <div>
          <div className="font-semibold">{row.currentStock.toLocaleString()} {row.unit}</div>
          <div className="text-xs text-secondary-500">Min: {row.minimumStock.toLocaleString()}</div>
        </div>
      ),
    },
    { key: 'unit', label: 'Unit' },
    { key: 'status', label: 'Status', render: (row) => getStockBadge(row.status) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEdit(row)} icon={Edit}>Edit</Button>
          <Button size="sm" variant="outline" onClick={() => handleDelete(row._id)} icon={Trash2} className="text-danger hover:bg-danger-light">Delete</Button>
        </div>
      ),
    },
  ];

  const lowStockCount = materials.filter((m) => m.status === 'low').length;

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStock =
      stockFilter === 'all' || (stockFilter === 'low' ? material.status === 'low' : material.status === 'sufficient');
    return matchesSearch && matchesStock;
  });

  // A stat card that doubles as a filter.
  const StatCard = ({ label, value, Icon, color, filter }) => (
    <button
      type="button"
      onClick={() => setStockFilter((prev) => (prev === filter ? 'all' : filter))}
      className={`text-left bg-white p-4 rounded-lg border transition-all ${
        stockFilter === filter ? 'border-primary ring-2 ring-primary/20' : 'border-secondary-200 hover:border-secondary-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-secondary-500">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <Icon className={`w-8 h-8 ${color}`} />
      </div>
    </button>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Raw Materials" description="Manage raw materials inventory">
        <Button onClick={handleAdd} icon={Plus}>Add Raw Material</Button>
      </PageHeader>

      {lowStockCount > 0 && (
        <div className="bg-warning-light border border-warning rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-warning-dark">Low Stock Alert</p>
            <p className="text-sm text-warning-dark">{lowStockCount} material(s) are at or below minimum stock. Please reorder soon.</p>
          </div>
        </div>
      )}

      {/* Stat cards — click to filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Materials" value={materials.length} Icon={Package} color="text-primary" filter="all" />
        <StatCard label="Low Stock Items" value={lowStockCount} Icon={AlertTriangle} color="text-warning" filter="low" />
        <StatCard label="Sufficient Stock" value={materials.length - lowStockCount} Icon={Package} color="text-success" filter="sufficient" />
      </div>

      {/* Materials List */}
      <div className="bg-white rounded-lg border border-secondary-200">
        <div className="p-4 border-b border-secondary-200 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[12rem]">
            <SearchFilter value={searchTerm} onChange={setSearchTerm} placeholder="Search raw materials..." />
          </div>
          {stockFilter !== 'all' && (
            <button
              onClick={() => setStockFilter('all')}
              className="inline-flex items-center gap-1.5 text-sm text-primary border border-primary/30 rounded-lg px-3 py-1.5"
            >
              Showing {stockFilter === 'low' ? 'low stock' : 'sufficient'} only
              <X size={14} />
            </button>
          )}
        </div>

        <Table columns={columns} data={filteredMaterials} loading={loading} emptyMessage="No raw materials found" />
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingMaterial ? 'Edit Raw Material' : 'Add Raw Material'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Material Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., PET Preform 500ml" required />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={RM_CATEGORIES}
              required
            />
            <Select
              label="Vendor"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              options={[{ value: '', label: 'Select Vendor (optional)' }, ...vendors.map((v) => ({ value: v._id, label: v.name }))]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Unit of Measure" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} options={UNIT_OPTIONS} required />
            <Input label="Minimum Stock Level" type="number" value={formData.minimumStock} onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })} required />
          </div>

          <Input label="Current Stock" type="number" value={formData.currentStock} onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })} helperText="Opening balance or current available stock" required />

          <Input label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" />

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editingMaterial ? 'Update' : 'Add'} Material</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RawMaterials;
