import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  ArrowRightLeft,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  X,
  Send,
  Download,
  Eye,
  AlertTriangle,
  ScanLine,
} from 'lucide-react';
import { transfersAPI, warehousesAPI, productsAPI } from '../services/api';
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
import { useLanguage } from '../context/LanguageContext';
import BarcodeScanner from '../components/BarcodeScanner';

const transferStatuses = [
  { value: 'draft', label: 'Draft', color: 'gray', icon: Clock },
  { value: 'pending', label: 'Pending', color: 'warning', icon: Clock },
  { value: 'in_transit', label: 'In Transit', color: 'info', icon: Truck },
  { value: 'partial', label: 'Partial', color: 'warning', icon: AlertTriangle },
  { value: 'completed', label: 'Completed', color: 'success', icon: CheckCircle2 },
  { value: 'cancelled', label: 'Cancelled', color: 'danger', icon: XCircle },
];

const transferPriorities = [
  { value: 'low', label: 'Low', color: 'gray' },
  { value: 'normal', label: 'Normal', color: 'info' },
  { value: 'high', label: 'High', color: 'warning' },
  { value: 'urgent', label: 'Urgent', color: 'danger' },
];

const transferReasons = [
  { value: 'restock', label: 'Restock' },
  { value: 'rebalance', label: 'Rebalance Inventory' },
  { value: 'customer_order', label: 'Customer Order' },
  { value: 'return', label: 'Return' },
  { value: 'damage', label: 'Damage' },
  { value: 'other', label: 'Other' },
];

const Transfers = () => {
  const { t } = useLanguage();
  const [transfers, setTransfers] = useState([]);
  const [stats, setStats] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const [filters, setFilters] = useState({
    status: '',
    fromWarehouse: '',
    toWarehouse: '',
    priority: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingTransfer, setViewingTransfer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [formData, setFormData] = useState({
    fromWarehouse: '',
    toWarehouse: '',
    items: [{ product: '', quantity: 1 }],
    priority: 'normal',
    reason: 'restock',
    notes: '',
    expectedDeliveryDate: '',
  });

  useEffect(() => {
    fetchTransfers();
    fetchWarehouses();
    fetchStats();
    fetchProducts();
  }, [pagination.page, filters.status, filters.fromWarehouse, filters.toWarehouse, filters.priority]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 20,
        ...(filters.status && { status: filters.status }),
        ...(filters.fromWarehouse && { fromWarehouse: filters.fromWarehouse }),
        ...(filters.toWarehouse && { toWarehouse: filters.toWarehouse }),
        ...(filters.priority && { priority: filters.priority }),
      };
      const response = await transfersAPI.getAll(params);
      setTransfers(response.data.data);
      setPagination({
        page: response.data.pagination.page,
        totalPages: response.data.pagination.pages,
        total: response.data.pagination.total,
      });
    } catch (error) {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehousesAPI.getList();
      setWarehouses(response.data.data);
    } catch (error) {
      console.error('Failed to load warehouses');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 100 });
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to load products');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await transfersAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const openModal = () => {
    setFormData({
      fromWarehouse: '',
      toWarehouse: '',
      items: [{ product: '', quantity: 1 }],
      priority: 'normal',
      reason: 'restock',
      notes: '',
      expectedDeliveryDate: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const viewTransfer = async (transfer) => {
    try {
      const response = await transfersAPI.getOne(transfer._id);
      setViewingTransfer(response.data.data);
      setShowViewModal(true);
    } catch (error) {
      toast.error('Failed to load transfer details');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', quantity: 1 }],
    });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.fromWarehouse === formData.toWarehouse) {
      toast.error('Source and destination warehouses must be different');
      return;
    }

    const validItems = formData.items.filter(item => item.product && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      setSaving(true);
      await transfersAPI.create({
        ...formData,
        items: validItems,
      });
      toast.success('Transfer request created successfully');
      closeModal();
      fetchTransfers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create transfer');
    } finally {
      setSaving(false);
    }
  };

  const handleShip = async (transfer) => {
    if (!window.confirm(`Ship transfer ${transfer.transferNumber}? This will deduct stock from ${transfer.fromWarehouseName}.`)) return;

    try {
      await transfersAPI.ship(transfer._id, {});
      toast.success('Transfer shipped successfully');
      fetchTransfers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to ship transfer');
    }
  };

  const handleReceive = async (transfer) => {
    if (!window.confirm(`Receive transfer ${transfer.transferNumber}? This will add stock to ${transfer.toWarehouseName}.`)) return;

    try {
      // Receive all items as full quantity
      const receivedItems = transfer.items.map(item => ({
        product: item.product._id || item.product,
        receivedQuantity: item.quantity,
      }));
      await transfersAPI.receive(transfer._id, { receivedItems });
      toast.success('Transfer received successfully');
      fetchTransfers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to receive transfer');
    }
  };

  const handleCancel = async (transfer) => {
    if (!window.confirm(`Cancel transfer ${transfer.transferNumber}?`)) return;

    try {
      await transfersAPI.cancel(transfer._id);
      toast.success('Transfer cancelled');
      fetchTransfers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel transfer');
    }
  };

  const getStatusConfig = (status) => transferStatuses.find(s => s.value === status) || transferStatuses[0];
  const getPriorityConfig = (priority) => transferPriorities.find(p => p.value === priority) || transferPriorities[1];

  const getStatusCount = (status) => {
    if (!stats?.byStatus) return 0;
    const stat = stats.byStatus.find(s => s._id === status);
    return stat?.count || 0;
  };

  const getActionItems = (transfer) => {
    const items = [
      { label: 'View Details', icon: Eye, onClick: () => viewTransfer(transfer) },
    ];

    if (transfer.status === 'pending') {
      items.push({ label: 'Ship Transfer', icon: Send, onClick: () => handleShip(transfer) });
      items.push({ divider: true });
      items.push({ label: 'Cancel', icon: XCircle, onClick: () => handleCancel(transfer), variant: 'danger' });
    }

    if (transfer.status === 'in_transit') {
      items.push({ label: 'Receive Transfer', icon: Download, onClick: () => handleReceive(transfer) });
    }

    return items;
  };

  // Filter products based on selected source warehouse
  const getAvailableProducts = () => {
    const sourceWarehouse = warehouses.find(w => w._id === formData.fromWarehouse);
    if (!sourceWarehouse) return products;
    return products.filter(p => p.location?.warehouse === sourceWarehouse.name);
  };

  // Handle barcode scan
  const handleBarcodeScan = async (code) => {
    try {
      let searchCode = code;
      let productId = null;

      // Check if the scanned code is a JSON QR code from our system
      // Format: {"type":"PRODUCT","id":"...","sku":"..."}
      try {
        const qrData = JSON.parse(code);
        if (qrData.type === 'PRODUCT') {
          searchCode = qrData.sku || code;
          productId = qrData.id;
        }
      } catch {
        // Not JSON, use the code as-is (regular barcode)
      }

      // Find the product in our available products
      const availableProducts = getAvailableProducts();
      const product = availableProducts.find(
        (p) =>
          p._id === productId ||
          p.sku.toLowerCase() === searchCode.toLowerCase() ||
          p.barcode === searchCode
      );

      if (product) {
        // Check if product already exists in items
        const existingIndex = formData.items.findIndex(
          (item) => item.product === product._id
        );

        if (existingIndex >= 0) {
          // Increment quantity
          const newItems = [...formData.items];
          newItems[existingIndex].quantity += 1;
          setFormData({ ...formData, items: newItems });
          toast.success(`Updated quantity: ${product.name}`);
        } else {
          // Add new item or replace empty slot
          const emptyIndex = formData.items.findIndex((item) => !item.product);
          if (emptyIndex >= 0) {
            const newItems = [...formData.items];
            newItems[emptyIndex] = { product: product._id, quantity: 1 };
            setFormData({ ...formData, items: newItems });
          } else {
            setFormData({
              ...formData,
              items: [...formData.items, { product: product._id, quantity: 1 }],
            });
          }
          toast.success(`Added: ${product.name}`);
        }
        setShowScanner(false);
      } else {
        // Try API lookup
        const response = await productsAPI.getBySku(searchCode);
        if (response.data.success && response.data.data) {
          const foundProduct = response.data.data;
          // Check if available in source warehouse
          const sourceWarehouse = warehouses.find(w => w._id === formData.fromWarehouse);
          if (sourceWarehouse && foundProduct.location?.warehouse !== sourceWarehouse.name) {
            toast.error(`Product not available in ${sourceWarehouse.name}`);
            return;
          }

          const existingIndex = formData.items.findIndex(
            (item) => item.product === foundProduct._id
          );

          if (existingIndex >= 0) {
            const newItems = [...formData.items];
            newItems[existingIndex].quantity += 1;
            setFormData({ ...formData, items: newItems });
            toast.success(`Updated quantity: ${foundProduct.name}`);
          } else {
            const emptyIndex = formData.items.findIndex((item) => !item.product);
            if (emptyIndex >= 0) {
              const newItems = [...formData.items];
              newItems[emptyIndex] = { product: foundProduct._id, quantity: 1 };
              setFormData({ ...formData, items: newItems });
            } else {
              setFormData({
                ...formData,
                items: [...formData.items, { product: foundProduct._id, quantity: 1 }],
              });
            }
            toast.success(`Added: ${foundProduct.name}`);
          }
          setShowScanner(false);
        } else {
          toast.error(`Product not found: ${searchCode}`);
        }
      }
    } catch (error) {
      toast.error(`Product not found: ${code}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={t('transfers.title')}
        subtitle={t('transfers.subtitle')}
        actions={
          <Button onClick={openModal} icon={Plus}>
            {t('transfers.createTransfer')}
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        {transferStatuses.slice(0, 6).map(status => (
          <StatCard
            key={status.value}
            title={status.label}
            value={getStatusCount(status.value)}
            icon={status.icon}
            iconColor={status.color}
            compact
          />
        ))}
      </div>

      {/* Filters */}
      <Card padding="md">
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="select w-auto min-w-[140px]"
          >
            <option value="">All Statuses</option>
            {transferStatuses.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          <select
            value={filters.fromWarehouse}
            onChange={(e) => setFilters({ ...filters, fromWarehouse: e.target.value })}
            className="select w-auto min-w-[160px]"
          >
            <option value="">From: All Warehouses</option>
            {warehouses.map(wh => (
              <option key={wh._id} value={wh._id}>{wh.name}</option>
            ))}
          </select>

          <select
            value={filters.toWarehouse}
            onChange={(e) => setFilters({ ...filters, toWarehouse: e.target.value })}
            className="select w-auto min-w-[160px]"
          >
            <option value="">To: All Warehouses</option>
            {warehouses.map(wh => (
              <option key={wh._id} value={wh._id}>{wh.name}</option>
            ))}
          </select>

          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="select w-auto min-w-[120px]"
          >
            <option value="">All Priorities</option>
            {transferPriorities.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Transfers Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <LoadingSpinner.Container className="h-64" />
        ) : transfers.length === 0 ? (
          <EmptyState
            icon={ArrowRightLeft}
            title="No transfers found"
            description="Create your first transfer to move inventory between warehouses"
            actionText="New Transfer"
            action={openModal}
            actionIcon={Plus}
          />
        ) : (
          <>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.Header>Transfer #</Table.Header>
                  <Table.Header>Route</Table.Header>
                  <Table.Header align="center">Items</Table.Header>
                  <Table.Header align="center">Priority</Table.Header>
                  <Table.Header align="center">Status</Table.Header>
                  <Table.Header>Created</Table.Header>
                  <Table.Header align="center" className="w-16">Actions</Table.Header>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {transfers.map((transfer, index) => {
                  const statusConfig = getStatusConfig(transfer.status);
                  const priorityConfig = getPriorityConfig(transfer.priority);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <Table.Row
                      key={transfer._id}
                      className="group hover:bg-secondary-50/50 transition-colors"
                      style={{ animationDelay: `${index * 20}ms` }}
                    >
                      <Table.Cell>
                        <button
                          onClick={() => viewTransfer(transfer)}
                          className="font-medium text-primary hover:text-primary-dark transition-colors whitespace-nowrap"
                        >
                          {transfer.transferNumber}
                        </button>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <div className="text-sm">
                            <span className="text-secondary-600">{transfer.fromWarehouseName}</span>
                          </div>
                          <ArrowRightLeft size={14} className="text-secondary-400" />
                          <div className="text-sm">
                            <span className="text-secondary-600">{transfer.toWarehouseName}</span>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell align="center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Package size={14} className="text-secondary-400" />
                          <span className="font-medium text-secondary">
                            {transfer.items?.length || 0}
                          </span>
                        </div>
                      </Table.Cell>
                      <Table.Cell align="center">
                        <Badge variant={priorityConfig.color} size="sm">
                          {priorityConfig.label}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell align="center">
                        <div className="flex items-center justify-center gap-1.5">
                          <StatusIcon size={14} className={`text-${statusConfig.color}`} />
                          <Badge variant={statusConfig.color} size="sm">
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div>
                          <p className="text-sm text-secondary">
                            {new Date(transfer.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-secondary-500">
                            by {transfer.requestedBy?.name || 'Unknown'}
                          </p>
                        </div>
                      </Table.Cell>
                      <Table.Cell align="center">
                        <ActionMenu items={getActionItems(transfer)} />
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
          </>
        )}
      </Card>

      {/* Create Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-modal p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-secondary-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-xl font-heading font-semibold text-secondary">
                {t('transfers.createTransfer')}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-secondary-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Warehouse Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">From Warehouse *</label>
                  <select
                    value={formData.fromWarehouse}
                    onChange={(e) => setFormData({ ...formData, fromWarehouse: e.target.value, items: [{ product: '', quantity: 1 }] })}
                    className="select"
                    required
                  >
                    <option value="">Select source warehouse</option>
                    {warehouses.map(wh => (
                      <option key={wh._id} value={wh._id}>{wh.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">To Warehouse *</label>
                  <select
                    value={formData.toWarehouse}
                    onChange={(e) => setFormData({ ...formData, toWarehouse: e.target.value })}
                    className="select"
                    required
                  >
                    <option value="">Select destination warehouse</option>
                    {warehouses.filter(wh => wh._id !== formData.fromWarehouse).map(wh => (
                      <option key={wh._id} value={wh._id}>{wh.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="label mb-0">Items to Transfer *</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowScanner(true)}
                      icon={ScanLine}
                      disabled={!formData.fromWarehouse}
                    >
                      Scan
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={addItem} icon={Plus}>
                      Add Item
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <select
                          value={item.product}
                          onChange={(e) => updateItem(index, 'product', e.target.value)}
                          className="select"
                          required
                        >
                          <option value="">Select product</option>
                          {getAvailableProducts().map(product => (
                            <option key={product._id} value={product._id}>
                              {product.name} ({product.sku}) - Qty: {product.quantity}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="input text-center"
                          min="1"
                          required
                        />
                      </div>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-2 text-danger hover:bg-danger-light rounded-lg transition-colors"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="select"
                  >
                    {transferPriorities.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Reason</label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="select"
                  >
                    {transferReasons.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Expected Delivery</label>
                  <input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="input resize-none"
                  placeholder="Additional notes about this transfer..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-secondary-100">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" loading={saving}>
                  {t('transfers.createTransfer')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Transfer Modal */}
      {showViewModal && viewingTransfer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-modal p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-secondary-100">
              <div>
                <h2 className="text-xl font-heading font-semibold text-secondary">
                  {viewingTransfer.transferNumber}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={getStatusConfig(viewingTransfer.status).color}>
                    {getStatusConfig(viewingTransfer.status).label}
                  </Badge>
                  <Badge variant={getPriorityConfig(viewingTransfer.priority).color}>
                    {getPriorityConfig(viewingTransfer.priority).label} Priority
                  </Badge>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-secondary-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Route */}
              <div className="flex items-center justify-between bg-secondary-50 rounded-xl p-4">
                <div className="text-center flex-1">
                  <p className="text-xs text-secondary-500 mb-1">From</p>
                  <p className="font-semibold text-secondary">{viewingTransfer.fromWarehouseName}</p>
                </div>
                <div className="flex items-center gap-2 px-4">
                  <div className="w-8 h-[2px] bg-secondary-300"></div>
                  <Truck size={20} className="text-primary" />
                  <div className="w-8 h-[2px] bg-secondary-300"></div>
                </div>
                <div className="text-center flex-1">
                  <p className="text-xs text-secondary-500 mb-1">To</p>
                  <p className="font-semibold text-secondary">{viewingTransfer.toWarehouseName}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold text-secondary mb-3">Items ({viewingTransfer.items?.length})</h3>
                <div className="border border-secondary-100 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-secondary-200/60">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-secondary-600">Product</th>
                        <th className="text-center px-4 py-2 text-xs font-semibold text-secondary-600">Qty</th>
                        <th className="text-center px-4 py-2 text-xs font-semibold text-secondary-600">Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingTransfer.items?.map((item, index) => (
                        <tr key={index} className="border-t border-secondary-100">
                          <td className="px-4 py-3">
                            <p className="font-medium text-secondary">{item.productName || item.product?.name}</p>
                            <code className="text-xs text-secondary-500">{item.sku || item.product?.sku}</code>
                          </td>
                          <td className="text-center px-4 py-3 font-semibold text-secondary">
                            {item.quantity}
                          </td>
                          <td className="text-center px-4 py-3">
                            <span className={item.receivedQuantity >= item.quantity ? 'text-success font-semibold' : 'text-secondary-500'}>
                              {item.receivedQuantity || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="font-semibold text-secondary mb-3">Timeline</h3>
                <div className="space-y-3">
                  {viewingTransfer.requestedDate && (
                    <div className="flex items-center gap-3 text-sm">
                      <Clock size={16} className="text-secondary-400" />
                      <span className="text-secondary-600">Requested</span>
                      <span className="text-secondary ml-auto">
                        {new Date(viewingTransfer.requestedDate).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {viewingTransfer.shippedDate && (
                    <div className="flex items-center gap-3 text-sm">
                      <Truck size={16} className="text-info" />
                      <span className="text-secondary-600">Shipped</span>
                      <span className="text-secondary ml-auto">
                        {new Date(viewingTransfer.shippedDate).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {viewingTransfer.receivedDate && (
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle2 size={16} className="text-success" />
                      <span className="text-secondary-600">Received</span>
                      <span className="text-secondary ml-auto">
                        {new Date(viewingTransfer.receivedDate).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {viewingTransfer.notes && (
                <div>
                  <h3 className="font-semibold text-secondary mb-2">Notes</h3>
                  <p className="text-secondary-600 bg-secondary-50 rounded-lg p-3">{viewingTransfer.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-secondary-100">
                {viewingTransfer.status === 'pending' && (
                  <>
                    <Button
                      variant="danger"
                      onClick={() => { setShowViewModal(false); handleCancel(viewingTransfer); }}
                    >
                      Cancel Transfer
                    </Button>
                    <Button
                      icon={Send}
                      onClick={() => { setShowViewModal(false); handleShip(viewingTransfer); }}
                    >
                      Ship Transfer
                    </Button>
                  </>
                )}
                {viewingTransfer.status === 'in_transit' && (
                  <Button
                    icon={Download}
                    onClick={() => { setShowViewModal(false); handleReceive(viewingTransfer); }}
                  >
                    Receive Transfer
                  </Button>
                )}
                {!['pending', 'in_transit'].includes(viewingTransfer.status) && (
                  <Button variant="secondary" onClick={() => setShowViewModal(false)}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
      />
    </div>
  );
};

export default Transfers;
