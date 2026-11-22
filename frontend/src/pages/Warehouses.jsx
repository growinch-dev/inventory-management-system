import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Warehouse,
  Edit,
  Trash2,
  X,
  MapPin,
  Phone,
  Mail,
  Package,
  Clock,
  Users,
  Building2,
  BarChart3,
  CheckCircle2,
  Star,
} from 'lucide-react';
import { warehousesAPI } from '../services/api';
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
} from '../components/ui';
import { useLanguage } from '../context/LanguageContext';

const warehouseTypes = [
  { value: 'main', label: 'Main Warehouse', color: 'primary' },
  { value: 'distribution', label: 'Distribution Center', color: 'info' },
  { value: 'regional', label: 'Regional Warehouse', color: 'success' },
  { value: 'returns', label: 'Returns Center', color: 'warning' },
  { value: 'quarantine', label: 'Quarantine', color: 'danger' },
];

const Warehouses = () => {
  const { t } = useLanguage();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'distribution',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    maxItems: 10000,
    weekdayOpen: '09:00',
    weekdayClose: '18:00',
    weekendOpen: '',
    weekendClose: '',
    isActive: true,
    isDefault: false,
    notes: '',
  });

  useEffect(() => {
    fetchWarehouses();
  }, [pagination.page, typeFilter]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 20,
        ...(search && { search }),
        ...(typeFilter && { type: typeFilter }),
      };
      const response = await warehousesAPI.getAll(params);
      setWarehouses(response.data.data);
      setPagination({
        page: response.data.pagination.page,
        totalPages: response.data.pagination.pages,
        total: response.data.pagination.total,
      });
    } catch (error) {
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchWarehouses();
  };

  const openModal = (warehouse = null) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        code: warehouse.code || '',
        name: warehouse.name || '',
        type: warehouse.type || 'distribution',
        street: warehouse.address?.street || '',
        city: warehouse.address?.city || '',
        state: warehouse.address?.state || '',
        pincode: warehouse.address?.pincode || '',
        country: warehouse.address?.country || 'India',
        contactName: warehouse.contactPerson?.name || '',
        contactPhone: warehouse.contactPerson?.phone || '',
        contactEmail: warehouse.contactPerson?.email || '',
        maxItems: warehouse.capacity?.maxItems || 10000,
        weekdayOpen: warehouse.operatingHours?.weekdays?.open || '09:00',
        weekdayClose: warehouse.operatingHours?.weekdays?.close || '18:00',
        weekendOpen: warehouse.operatingHours?.weekends?.open || '',
        weekendClose: warehouse.operatingHours?.weekends?.close || '',
        isActive: warehouse.isActive !== false,
        isDefault: warehouse.isDefault || false,
        notes: warehouse.notes || '',
      });
    } else {
      setEditingWarehouse(null);
      setFormData({
        code: '',
        name: '',
        type: 'distribution',
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        maxItems: 10000,
        weekdayOpen: '09:00',
        weekdayClose: '18:00',
        weekendOpen: '',
        weekendClose: '',
        isActive: true,
        isDefault: false,
        notes: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingWarehouse(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      code: formData.code.toUpperCase(),
      name: formData.name,
      type: formData.type,
      address: {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        country: formData.country,
      },
      contactPerson: {
        name: formData.contactName,
        phone: formData.contactPhone,
        email: formData.contactEmail,
      },
      capacity: {
        maxItems: parseInt(formData.maxItems) || 10000,
      },
      operatingHours: {
        weekdays: { open: formData.weekdayOpen, close: formData.weekdayClose },
        weekends: { open: formData.weekendOpen, close: formData.weekendClose },
      },
      isActive: formData.isActive,
      isDefault: formData.isDefault,
      notes: formData.notes,
    };

    try {
      setSaving(true);
      if (editingWarehouse) {
        await warehousesAPI.update(editingWarehouse._id, payload);
        toast.success('Warehouse updated successfully');
      } else {
        await warehousesAPI.create(payload);
        toast.success('Warehouse created successfully');
      }
      closeModal();
      fetchWarehouses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save warehouse');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this warehouse?')) return;

    try {
      await warehousesAPI.delete(id);
      toast.success('Warehouse deleted successfully');
      fetchWarehouses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete warehouse');
    }
  };

  const getTypeConfig = (type) => warehouseTypes.find(t => t.value === type) || warehouseTypes[1];

  const getActionItems = (warehouse) => [
    { label: 'View Details', icon: BarChart3, href: `/warehouses/${warehouse._id}` },
    { label: 'Edit', icon: Edit, onClick: () => openModal(warehouse) },
    { divider: true },
    { label: 'Delete', icon: Trash2, onClick: () => handleDelete(warehouse._id), variant: 'danger', disabled: warehouse.isDefault },
  ];

  const FormSection = ({ icon: Icon, title, children }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-secondary-100">
        <Icon size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-secondary">{title}</h3>
      </div>
      {children}
    </div>
  );

  // Grid view card
  const WarehouseCard = ({ warehouse }) => {
    const typeConfig = getTypeConfig(warehouse.type);
    return (
      <Card className="group hover:shadow-card-hover transition-all duration-200 relative overflow-hidden">
        {warehouse.isDefault && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-warning bg-warning-light px-2 py-1 rounded-full">
              <Star size={12} className="fill-warning" />
              Default
            </span>
          </div>
        )}
        <Card.Content className="p-5">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${typeConfig.color}-50 transition-transform group-hover:scale-105`}>
              <Warehouse size={24} className={`text-${typeConfig.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-xs font-mono bg-secondary-100 text-secondary-600 px-1.5 py-0.5 rounded">
                  {warehouse.code}
                </code>
                <Badge variant={warehouse.isActive ? 'success' : 'gray'} size="sm">
                  {warehouse.isActive ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>
              <h3 className="font-semibold text-secondary truncate">{warehouse.name}</h3>
              <p className="text-sm text-secondary-500 capitalize">{typeConfig.label}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {warehouse.address?.city && (
              <div className="flex items-center gap-2 text-sm text-secondary-600">
                <MapPin size={14} className="text-secondary-400 flex-shrink-0" />
                <span className="truncate">
                  {warehouse.address.city}, {warehouse.address.state}
                </span>
              </div>
            )}
            {warehouse.contactPerson?.phone && (
              <div className="flex items-center gap-2 text-sm text-secondary-600">
                <Phone size={14} className="text-secondary-400 flex-shrink-0" />
                <span>{warehouse.contactPerson.phone}</span>
              </div>
            )}
            {warehouse.capacity && (
              <div className="flex items-center gap-2 text-sm text-secondary-600">
                <Package size={14} className="text-secondary-400 flex-shrink-0" />
                <span>Capacity: {warehouse.capacity.maxItems?.toLocaleString()} items</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-secondary-100 flex items-center justify-between">
            <Link
              to={`/warehouses/${warehouse._id}`}
              className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
            >
              View Details →
            </Link>
            <ActionMenu items={getActionItems(warehouse)} />
          </div>
        </Card.Content>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={t('warehouses.title')}
        subtitle={t('warehouses.subtitle')}
        actions={
          <Button onClick={() => openModal()} icon={Plus}>
            {t('warehouses.addWarehouse')}
          </Button>
        }
      />

      {/* Filters */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-4 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search warehouses..."
                className="input pl-11"
              />
            </div>
            <Button type="submit" variant="secondary">
              {t('common.search')}
            </Button>
          </form>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="select w-auto min-w-[160px]"
          >
            <option value="">All Types</option>
            {warehouseTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <div className="flex border border-secondary-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white text-secondary-600 hover:bg-secondary-50'} transition-colors`}
            >
              <Package size={18} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-white text-secondary-600 hover:bg-secondary-50'} transition-colors`}
            >
              <BarChart3 size={18} />
            </button>
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <LoadingSpinner.Container className="h-64" />
      ) : warehouses.length === 0 ? (
        <Card>
          <EmptyState
            icon={Warehouse}
            title={search || typeFilter ? "No warehouses match your filters" : "No warehouses found"}
            description={search || typeFilter ? "Try different search terms or filters" : "Add your first warehouse to get started"}
            actionText="Add Warehouse"
            action={() => openModal()}
            actionIcon={Plus}
          />
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((warehouse, index) => (
            <div key={warehouse._id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in">
              <WarehouseCard warehouse={warehouse} />
            </div>
          ))}
        </div>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.Header>Warehouse</Table.Header>
                <Table.Header>Type</Table.Header>
                <Table.Header>Location</Table.Header>
                <Table.Header>Contact</Table.Header>
                <Table.Header align="center">Capacity</Table.Header>
                <Table.Header align="center">Status</Table.Header>
                <Table.Header align="center" className="w-16">Actions</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {warehouses.map((warehouse, index) => {
                const typeConfig = getTypeConfig(warehouse.type);
                return (
                  <Table.Row
                    key={warehouse._id}
                    className="group hover:bg-secondary-50/50 transition-colors"
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-${typeConfig.color}-50 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105`}>
                          <Warehouse size={18} className={`text-${typeConfig.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link to={`/warehouses/${warehouse._id}`} className="font-medium text-secondary hover:text-primary transition-colors">
                              {warehouse.name}
                            </Link>
                            {warehouse.isDefault && (
                              <Star size={14} className="text-warning fill-warning" />
                            )}
                          </div>
                          <code className="text-xs font-mono text-secondary-500">{warehouse.code}</code>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={typeConfig.color} size="sm">
                        {typeConfig.label}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      {warehouse.address?.city ? (
                        <div className="flex items-center gap-1.5 text-sm text-secondary-600">
                          <MapPin size={13} className="text-secondary-400" />
                          {warehouse.address.city}, {warehouse.address.state}
                        </div>
                      ) : (
                        <span className="text-secondary-400">-</span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {warehouse.contactPerson?.name ? (
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-secondary">{warehouse.contactPerson.name}</p>
                          <p className="text-xs text-secondary-500">{warehouse.contactPerson.phone}</p>
                        </div>
                      ) : (
                        <span className="text-secondary-400">-</span>
                      )}
                    </Table.Cell>
                    <Table.Cell align="center">
                      <span className="text-sm font-medium text-secondary">
                        {warehouse.capacity?.maxItems?.toLocaleString() || '-'}
                      </span>
                    </Table.Cell>
                    <Table.Cell align="center">
                      <Badge variant={warehouse.isActive ? 'success' : 'gray'} size="sm">
                        {warehouse.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell align="center">
                      <ActionMenu items={getActionItems(warehouse)} />
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
          <Table.Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={20}
            onPageChange={(page) => setPagination({ ...pagination, page })}
          />
        </Card>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-modal p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-secondary-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-xl font-heading font-semibold text-secondary">
                {editingWarehouse ? t('warehouses.editWarehouse') : t('warehouses.addWarehouse')}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X size={20} className="text-secondary-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <FormSection icon={Building2} title="Basic Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="code" className="label">Warehouse Code *</label>
                    <input
                      id="code"
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="input font-mono"
                      placeholder="e.g., MUM-MAIN"
                      maxLength={10}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="type" className="label">Type *</label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="select"
                      required
                    >
                      {warehouseTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="name" className="label">Warehouse Name *</label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      placeholder="e.g., Mumbai Main Warehouse"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="maxItems" className="label">Max Capacity (Items)</label>
                    <input
                      id="maxItems"
                      type="number"
                      value={formData.maxItems}
                      onChange={(e) => setFormData({ ...formData, maxItems: e.target.value })}
                      className="input"
                      placeholder="10000"
                      min="0"
                    />
                  </div>

                  <div className="flex items-center gap-6 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 text-primary border-secondary-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-secondary">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                        className="w-4 h-4 text-primary border-secondary-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-secondary">Default Warehouse</span>
                    </label>
                  </div>
                </div>
              </FormSection>

              {/* Address */}
              <FormSection icon={MapPin} title="Address">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="street" className="label">Street Address</label>
                    <input
                      id="street"
                      type="text"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      className="input"
                      placeholder="Building, street, area"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="label">City *</label>
                    <input
                      id="city"
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="input"
                      placeholder="City"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="label">State *</label>
                    <input
                      id="state"
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="input"
                      placeholder="State"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="pincode" className="label">Pincode</label>
                    <input
                      id="pincode"
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="input"
                      placeholder="400001"
                      maxLength={6}
                    />
                  </div>

                  <div>
                    <label htmlFor="country" className="label">Country</label>
                    <input
                      id="country"
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="input"
                      placeholder="India"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Contact Person */}
              <FormSection icon={Users} title="Contact Person">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="contactName" className="label">Name</label>
                    <input
                      id="contactName"
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="input"
                      placeholder="Contact name"
                    />
                  </div>

                  <div>
                    <label htmlFor="contactPhone" className="label">Phone</label>
                    <input
                      id="contactPhone"
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="input"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div>
                    <label htmlFor="contactEmail" className="label">Email</label>
                    <input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="input"
                      placeholder="warehouse@example.com"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Operating Hours */}
              <FormSection icon={Clock} title="Operating Hours">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="weekdayOpen" className="label">Weekday Open</label>
                    <input
                      id="weekdayOpen"
                      type="time"
                      value={formData.weekdayOpen}
                      onChange={(e) => setFormData({ ...formData, weekdayOpen: e.target.value })}
                      className="input"
                    />
                  </div>

                  <div>
                    <label htmlFor="weekdayClose" className="label">Weekday Close</label>
                    <input
                      id="weekdayClose"
                      type="time"
                      value={formData.weekdayClose}
                      onChange={(e) => setFormData({ ...formData, weekdayClose: e.target.value })}
                      className="input"
                    />
                  </div>

                  <div>
                    <label htmlFor="weekendOpen" className="label">Weekend Open</label>
                    <input
                      id="weekendOpen"
                      type="time"
                      value={formData.weekendOpen}
                      onChange={(e) => setFormData({ ...formData, weekendOpen: e.target.value })}
                      className="input"
                    />
                  </div>

                  <div>
                    <label htmlFor="weekendClose" className="label">Weekend Close</label>
                    <input
                      id="weekendClose"
                      type="time"
                      value={formData.weekendClose}
                      onChange={(e) => setFormData({ ...formData, weekendClose: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="label">Notes</label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="input resize-none"
                  placeholder="Additional notes about this warehouse..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-secondary-100">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" loading={saving}>
                  {editingWarehouse ? t('warehouses.editWarehouse') : t('warehouses.addWarehouse')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;
