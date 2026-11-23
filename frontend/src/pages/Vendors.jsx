import { useState, useEffect } from 'react';
import {
  Plus,
  Building2,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreVertical,
  Package,
} from 'lucide-react';
import { customersAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  PageHeader,
  Card,
  Button,
  Modal,
  Input,
  Textarea,
  LoadingSpinner,
  EmptyState,
} from '../components/ui';

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gstNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
  });

  useEffect(() => {
    fetchVendors();
  }, [pagination.page]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    if (activeMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenu]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 20,
        ...(search && { search }),
      };
      const response = await customersAPI.getAll(params);
      setVendors(response.data.data);
      setPagination({
        page: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.total,
      });
    } catch (error) {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVendors();
  };

  const openModal = (vendor = null) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        name: vendor.name || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        gstNumber: vendor.gstNumber || '',
        address: vendor.address || '',
        city: vendor.city || '',
        state: vendor.state || '',
        pincode: vendor.pincode || '',
        notes: vendor.notes || '',
      });
    } else {
      setEditingVendor(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        gstNumber: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        notes: '',
      });
    }
    setShowModal(true);
    setActiveMenu(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingVendor(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      if (editingVendor) {
        await customersAPI.update(editingVendor._id, formData);
        toast.success('Vendor updated successfully');
      } else {
        await customersAPI.create(formData);
        toast.success('Vendor added successfully');
      }
      closeModal();
      fetchVendors();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;

    try {
      await customersAPI.delete(id);
      toast.success('Vendor deleted successfully');
      fetchVendors();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete vendor');
    }
    setActiveMenu(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Vendors"
        description="Manage your raw material suppliers and vendors"
      >
        <Button onClick={() => openModal()} icon={Plus}>
          Add Vendor
        </Button>
      </PageHeader>

      {/* Search */}
      <Card padding="md">
        <form onSubmit={handleSearchSubmit} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors by name, email, or phone..."
              className="input pl-11"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      {/* Vendors Grid */}
      {loading ? (
        <LoadingSpinner.Container className="h-64" />
      ) : vendors.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title={search ? "No vendors match your search" : "No vendors found"}
            description={search ? "Try a different search term" : "Add your first vendor to get started"}
            actionText="Add Vendor"
            actionOnClick={() => openModal()}
            actionIcon={Plus}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor, index) => (
              <Card
                key={vendor._id}
                padding="lg"
                className="group hover:shadow-card-hover transition-all duration-200"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
                      <Building2 className="text-primary" size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-secondary truncate max-w-full" title={vendor.name}>{vendor.name}</h3>
                      {vendor.gstNumber && (
                        <p className="text-xs text-secondary-500 font-mono truncate" title={`GST: ${vendor.gstNumber}`}>GST: {vendor.gstNumber}</p>
                      )}
                    </div>
                  </div>
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === vendor._id ? null : vendor._id);
                      }}
                      className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                      aria-label="Vendor actions"
                    >
                      <MoreVertical size={16} className="text-secondary-500" />
                    </button>
                    {activeMenu === vendor._id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-secondary-100 py-1.5 z-dropdown animate-scale-in origin-top-right">
                        <button
                          onClick={() => openModal(vendor)}
                          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
                        >
                          <Edit size={15} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(vendor._id)}
                          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-danger hover:bg-danger-light transition-colors"
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 text-sm">
                  {vendor.email && (
                    <a
                      href={`mailto:${vendor.email}`}
                      className="flex items-center gap-2.5 text-secondary-600 hover:text-primary transition-colors"
                    >
                      <Mail size={15} className="text-secondary-400 flex-shrink-0" />
                      <span className="truncate">{vendor.email}</span>
                    </a>
                  )}
                  {vendor.phone && (
                    <a
                      href={`tel:${vendor.phone}`}
                      className="flex items-center gap-2.5 text-secondary-600 hover:text-primary transition-colors"
                    >
                      <Phone size={15} className="text-secondary-400 flex-shrink-0" />
                      <span>{vendor.phone}</span>
                    </a>
                  )}
                  {(vendor.city || vendor.state) && (
                    <div className="flex items-center gap-2.5 text-secondary-600">
                      <MapPin size={15} className="text-secondary-400 flex-shrink-0" />
                      <span>
                        {vendor.city && vendor.city}
                        {vendor.city && vendor.state && ', '}
                        {vendor.state}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-secondary-100 flex items-center justify-between">
                  <time className="text-xs text-secondary-400" dateTime={vendor.createdAt}>
                    Added {new Date(vendor.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </time>
                  <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                    <Package size={12} />
                    Supplier
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-secondary-200 px-4 py-3">
              <p className="text-sm text-secondary-500">
                Showing <span className="font-medium text-secondary">{(pagination.page - 1) * 20 + 1}</span> to{' '}
                <span className="font-medium text-secondary">{Math.min(pagination.page * 20, pagination.total)}</span> of{' '}
                <span className="font-medium text-secondary">{pagination.total}</span> vendors
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  icon={ChevronLeft}
                >
                  Previous
                </Button>
                <span className="px-4 py-2 text-sm font-medium text-secondary">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-modal p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-secondary-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-xl font-heading font-semibold text-secondary">
                {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X size={20} className="text-secondary-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label htmlFor="name" className="label">Vendor Name *</label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Enter vendor name"
                    required
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
                    placeholder="vendor@example.com"
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

                <div className="md:col-span-2">
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

                <div className="md:col-span-2">
                  <label htmlFor="address" className="label">Address</label>
                  <textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="input resize-none"
                    placeholder="Street address"
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

                <div className="md:col-span-2">
                  <label htmlFor="notes" className="label">Notes</label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="input resize-none"
                    placeholder="Additional notes about the vendor..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-secondary-100">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  {editingVendor ? 'Update Vendor' : 'Add Vendor'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
