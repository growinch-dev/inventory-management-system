import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Truck,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  Phone,
  MapPin,
  Building2,
  CreditCard,
  FileText,
} from 'lucide-react';
import { suppliersAPI } from '../services/api';
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

// Module scope (NOT inside the component) so inputs inside it keep focus while typing.
const FormSection = ({ icon: Icon, title, children }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 pb-2 border-b border-secondary-100">
      <Icon size={16} className="text-primary" />
      <h3 className="text-sm font-semibold text-secondary">{title}</h3>
    </div>
    {children}
  </div>
);

const Suppliers = () => {
  const { t } = useLanguage();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    alternatePhone: '',
    gstNumber: '',
    panNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    website: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    paymentTerms: '',
    notes: '',
    isActive: true,
  });

  useEffect(() => {
    fetchSuppliers();
  }, [pagination.page]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 20,
        ...(search && { search }),
      };
      const response = await suppliersAPI.getAll(params);
      setSuppliers(response.data.data);
      setPagination({
        page: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.total,
      });
    } catch (error) {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSuppliers();
  };

  const openModal = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name || '',
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        alternatePhone: supplier.alternatePhone || '',
        gstNumber: supplier.gstNumber || '',
        panNumber: supplier.panNumber || '',
        address: supplier.address || '',
        city: supplier.city || '',
        state: supplier.state || '',
        pincode: supplier.pincode || '',
        country: supplier.country || 'India',
        website: supplier.website || '',
        bankName: supplier.bankName || '',
        accountNumber: supplier.accountNumber || '',
        ifscCode: supplier.ifscCode || '',
        paymentTerms: supplier.paymentTerms || '',
        notes: supplier.notes || '',
        isActive: supplier.isActive !== false,
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        alternatePhone: '',
        gstNumber: '',
        panNumber: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        website: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        paymentTerms: '',
        notes: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      if (editingSupplier) {
        await suppliersAPI.update(editingSupplier._id, formData);
        toast.success('Supplier updated successfully');
      } else {
        await suppliersAPI.create(formData);
        toast.success('Supplier created successfully');
      }
      closeModal();
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;

    try {
      await suppliersAPI.delete(id);
      toast.success('Supplier deleted successfully');
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete supplier');
    }
  };

  const getActionItems = (supplier) => [
    { label: 'Edit', icon: Edit, onClick: () => openModal(supplier) },
    { label: 'Delete', icon: Trash2, onClick: () => handleDelete(supplier._id), variant: 'danger' },
  ];


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={t('suppliers.title')}
        subtitle={t('suppliers.subtitle')}
        actions={
          <Button onClick={() => openModal()} icon={Plus}>
            {t('suppliers.addSupplier')}
          </Button>
        }
      />

      {/* Search */}
      <Card padding="md">
        <form onSubmit={handleSearchSubmit} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers by name, contact, or email..."
              className="input pl-11"
            />
          </div>
          <Button type="submit" variant="secondary">
            {t('common.search')}
          </Button>
        </form>
      </Card>

      {/* Suppliers Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <LoadingSpinner.Container className="h-64" />
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={search ? "No suppliers match your search" : "No suppliers found"}
            description={search ? "Try a different search term" : "Add your first supplier to get started"}
            actionText="Add Supplier"
            actionOnClick={() => openModal()}
            actionIcon={Plus}
          />
        ) : (
          <>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.Header>Supplier</Table.Header>
                  <Table.Header>Contact</Table.Header>
                  <Table.Header>Location</Table.Header>
                  <Table.Header>GST Number</Table.Header>
                  <Table.Header align="center">Status</Table.Header>
                  <Table.Header align="center" className="w-16">Actions</Table.Header>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {suppliers.map((supplier, index) => (
                  <Table.Row
                    key={supplier._id}
                    className="group hover:bg-secondary-50/50 transition-colors"
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent-50 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                          <Truck size={18} className="text-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-secondary">{supplier.name}</p>
                          {supplier.contactPerson && (
                            <p className="text-xs text-secondary-500">{supplier.contactPerson}</p>
                          )}
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="space-y-1">
                        {supplier.email && (
                          <a href={`mailto:${supplier.email}`} className="flex items-center gap-1.5 text-sm text-secondary-600 hover:text-primary transition-colors">
                            <Mail size={13} className="text-secondary-400" />
                            <span className="truncate max-w-[150px]">{supplier.email}</span>
                          </a>
                        )}
                        {supplier.phone && (
                          <a href={`tel:${supplier.phone}`} className="flex items-center gap-1.5 text-sm text-secondary-600 hover:text-primary transition-colors">
                            <Phone size={13} className="text-secondary-400" />
                            <span>{supplier.phone}</span>
                          </a>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      {(supplier.city || supplier.state) ? (
                        <div className="flex items-center gap-1.5 text-sm text-secondary-600">
                          <MapPin size={13} className="text-secondary-400" />
                          <span>
                            {supplier.city && `${supplier.city}, `}
                            {supplier.state || supplier.country}
                          </span>
                        </div>
                      ) : (
                        <span className="text-secondary-400">-</span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {supplier.gstNumber ? (
                        <code className="text-xs font-mono bg-secondary-100 text-secondary-700 px-2 py-1 rounded">
                          {supplier.gstNumber}
                        </code>
                      ) : (
                        <span className="text-secondary-400">-</span>
                      )}
                    </Table.Cell>
                    <Table.Cell align="center">
                      <Badge variant={supplier.isActive !== false ? 'success' : 'gray'} size="sm">
                        {supplier.isActive !== false ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell align="center">
                      <ActionMenu items={getActionItems(supplier)} />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>

            {/* Pagination */}
            <Table.Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={20}
              onPageChange={(page) => setPagination({ ...pagination, page })}
            />
          </>
        )}
      </Card>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-modal p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-secondary-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-xl font-heading font-semibold text-secondary">
                {editingSupplier ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}
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
                  <div className="md:col-span-2">
                    <label htmlFor="name" className="label">Supplier Name *</label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      placeholder="Company or business name"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="contactPerson" className="label">Contact Person</label>
                    <input
                      id="contactPerson"
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="input"
                      placeholder="Primary contact name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="label">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input"
                      placeholder="supplier@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="label">Phone</label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div>
                    <label htmlFor="alternatePhone" className="label">Alternate Phone</label>
                    <input
                      id="alternatePhone"
                      type="tel"
                      value={formData.alternatePhone}
                      onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                      className="input"
                      placeholder="+91 98765 43211"
                    />
                  </div>

                  <div>
                    <label htmlFor="website" className="label">Website</label>
                    <input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="input"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="status" className="label">Status</label>
                    <select
                      id="status"
                      value={formData.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                      className="select"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </FormSection>

              {/* Tax Information */}
              <FormSection icon={FileText} title="Tax Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="gstNumber" className="label">GST Number</label>
                    <input
                      id="gstNumber"
                      type="text"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                      className="input font-mono"
                      placeholder="e.g., 07AABCM1234A1Z5"
                      maxLength={15}
                    />
                  </div>

                  <div>
                    <label htmlFor="panNumber" className="label">PAN Number</label>
                    <input
                      id="panNumber"
                      type="text"
                      value={formData.panNumber}
                      onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                      className="input font-mono"
                      placeholder="e.g., AABCM1234A"
                      maxLength={10}
                    />
                  </div>
                </div>
              </FormSection>

              {/* Address */}
              <FormSection icon={MapPin} title="Address">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="address" className="label">Street Address</label>
                    <textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                      className="input resize-none"
                      placeholder="Building, street, area"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="label">City</label>
                    <input
                      id="city"
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="input"
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="label">State</label>
                    <input
                      id="state"
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="input"
                      placeholder="State"
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
                      placeholder="110001"
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

              {/* Bank Details */}
              <FormSection icon={CreditCard} title="Bank Details">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="bankName" className="label">Bank Name</label>
                    <input
                      id="bankName"
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="input"
                      placeholder="Bank name"
                    />
                  </div>

                  <div>
                    <label htmlFor="accountNumber" className="label">Account Number</label>
                    <input
                      id="accountNumber"
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="input font-mono"
                      placeholder="Account number"
                    />
                  </div>

                  <div>
                    <label htmlFor="ifscCode" className="label">IFSC Code</label>
                    <input
                      id="ifscCode"
                      type="text"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                      className="input font-mono"
                      placeholder="SBIN0001234"
                      maxLength={11}
                    />
                  </div>
                </div>
              </FormSection>

              {/* Additional */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="paymentTerms" className="label">Payment Terms</label>
                  <input
                    id="paymentTerms"
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="input"
                    placeholder="e.g., Net 30, COD"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="label">Notes</label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="input resize-none"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-secondary-100">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" loading={saving}>
                  {editingSupplier ? t('common.update') : t('common.add')} {t('suppliers.title').slice(0, -1)}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
