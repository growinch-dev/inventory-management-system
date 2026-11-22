import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  ShoppingCart,
  Eye,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  Package,
  Search,
  XCircle,
  Clock,
  Truck,
} from 'lucide-react';
import { purchaseOrdersAPI, suppliersAPI } from '../services/api';
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

const PO_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'gray', icon: Clock },
  { value: 'confirmed', label: 'Confirmed', color: 'info', icon: CheckCircle },
  { value: 'partial', label: 'Partial', color: 'warning', icon: Package },
  { value: 'received', label: 'Received', color: 'success', icon: Truck },
  { value: 'cancelled', label: 'Cancelled', color: 'danger', icon: XCircle },
];

const PurchaseOrders = () => {
  const { t } = useLanguage();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [supplier, setSupplier] = useState('');

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
    fetchStats();
  }, [pagination.page, status, supplier]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 20,
        ...(search && { search }),
        ...(status && { status }),
        ...(supplier && { supplier }),
      };
      const response = await purchaseOrdersAPI.getAll(params);
      setPurchaseOrders(response.data.data);
      setPagination({
        page: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.total,
      });
    } catch (error) {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll({ limit: 100 });
      setSuppliers(response.data.data);
    } catch (error) {
      console.error('Failed to load suppliers');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await purchaseOrdersAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPurchaseOrders();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase order?')) return;

    try {
      await purchaseOrdersAPI.delete(id);
      toast.success('Purchase order deleted successfully');
      fetchPurchaseOrders();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete purchase order');
    }
  };

  const handleConfirm = async (id) => {
    try {
      await purchaseOrdersAPI.confirm(id);
      toast.success('Purchase order confirmed');
      fetchPurchaseOrders();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to confirm purchase order');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this purchase order?')) return;

    try {
      await purchaseOrdersAPI.cancel(id);
      toast.success('Purchase order cancelled');
      fetchPurchaseOrders();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel purchase order');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await purchaseOrdersAPI.duplicate(id);
      toast.success('Purchase order duplicated');
      fetchPurchaseOrders();
    } catch (error) {
      toast.error('Failed to duplicate purchase order');
    }
  };

  const getStatusConfig = (poStatus) => PO_STATUSES.find((s) => s.value === poStatus) || PO_STATUSES[0];
  const getStatusCount = (statusValue) => {
    if (!stats?.byStatus) return 0;
    const stat = stats.byStatus.find((s) => s._id === statusValue);
    return stat?.count || 0;
  };

  const getActionItems = (po) => {
    const items = [
      { label: t('common.view'), icon: Eye, href: `/purchase-orders/${po._id}` },
    ];

    if (po.status === 'draft') {
      items.push(
        { label: t('common.edit'), icon: Edit, href: `/purchase-orders/${po._id}/edit` },
        { label: t('common.confirm'), icon: CheckCircle, onClick: () => handleConfirm(po._id), variant: 'success' }
      );
    }

    if (po.status === 'confirmed' || po.status === 'partial') {
      items.push({
        label: t('purchaseOrders.receive'),
        icon: Package,
        href: `/purchase-orders/${po._id}/receive`,
        variant: 'success',
      });
    }

    items.push(
      { label: t('invoices.duplicate'), icon: Copy, onClick: () => handleDuplicate(po._id) }
    );

    if (po.status === 'draft') {
      items.push({ divider: true });
      items.push({
        label: t('common.delete'),
        icon: Trash2,
        onClick: () => handleDelete(po._id),
        variant: 'danger',
      });
    }

    if (['draft', 'confirmed'].includes(po.status)) {
      items.push({
        label: t('common.cancel'),
        icon: XCircle,
        onClick: () => handleCancel(po._id),
        variant: 'danger',
      });
    }

    return items;
  };

  const statusOptions = [
    { value: '', label: t('common.all') + ' ' + t('common.status') },
    ...PO_STATUSES.map((s) => ({
      ...s,
      label: t(`purchaseOrders.status.${s.value}`),
    })),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={t('purchaseOrders.title')}
        subtitle={t('purchaseOrders.subtitle')}
        actions={
          <Button as={Link} to="/purchase-orders/new" icon={Plus}>
            {t('purchaseOrders.createPO')}
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {PO_STATUSES.map((statusItem) => (
          <StatCard
            key={statusItem.value}
            title={t(`purchaseOrders.status.${statusItem.value}`)}
            value={getStatusCount(statusItem.value)}
            icon={statusItem.icon}
            iconColor={statusItem.color}
            compact
          />
        ))}
      </div>

      {/* Filters */}
      <Card padding="md">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by PO number, supplier..."
              className="input pl-10"
            />
          </div>

          {/* Supplier Filter */}
          <select
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="input sm:w-48 cursor-pointer"
          >
            <option value="">{t('common.all')} {t('suppliers.title')}</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input sm:w-40 cursor-pointer"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <Button type="submit" variant="secondary">
            {t('common.search')}
          </Button>
        </form>
      </Card>

      {/* Purchase Orders Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <LoadingSpinner.Container className="h-64" />
        ) : purchaseOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={search || status ? 'No purchase orders match your filters' : 'No purchase orders found'}
            description={search || status ? 'Try adjusting your search or filters' : 'Create your first purchase order to start procurement'}
            actionText={t('purchaseOrders.createPO')}
            actionLink="/purchase-orders/new"
            actionIcon={Plus}
          />
        ) : (
          <>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.Header>{t('purchaseOrders.poNumber')}</Table.Header>
                  <Table.Header>{t('purchaseOrders.supplier')}</Table.Header>
                  <Table.Header>{t('purchaseOrders.poDate')}</Table.Header>
                  <Table.Header align="center">{t('invoices.items')}</Table.Header>
                  <Table.Header align="right">{t('invoices.grandTotal')}</Table.Header>
                  <Table.Header align="center">{t('common.status')}</Table.Header>
                  <Table.Header align="center" className="w-16">{t('common.actions')}</Table.Header>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {purchaseOrders.map((po, index) => {
                  const statusConfig = getStatusConfig(po.status);
                  return (
                    <Table.Row
                      key={po._id}
                      className="group hover:bg-secondary-50/50 transition-colors"
                      style={{ animationDelay: `${index * 20}ms` }}
                    >
                      <Table.Cell>
                        <Link
                          to={`/purchase-orders/${po._id}`}
                          className="font-semibold text-primary hover:text-primary-dark transition-colors"
                        >
                          {po.poNumber}
                        </Link>
                      </Table.Cell>
                      <Table.Cell>
                        <p className="font-medium text-secondary">{po.supplierName}</p>
                        {po.supplierEmail && (
                          <p className="text-xs text-secondary-500 truncate max-w-[180px]">{po.supplierEmail}</p>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <time dateTime={po.poDate} className="text-secondary">
                          {new Date(po.poDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </time>
                        {po.expectedDeliveryDate && (
                          <p className="text-xs text-secondary-500">
                            Expected: {new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </Table.Cell>
                      <Table.Cell align="center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Package size={14} className="text-secondary-400" />
                          <span className="font-medium text-secondary">
                            {po.items?.length || 0}
                          </span>
                        </div>
                        {po.totalReceivedItems > 0 && (
                          <p className="text-xs text-secondary-500">
                            {po.totalReceivedItems}/{po.totalItems} received
                          </p>
                        )}
                      </Table.Cell>
                      <Table.Cell align="right">
                        <p className="font-semibold text-secondary tabular-nums">
                          ₹{po.grandTotal?.toLocaleString('en-IN')}
                        </p>
                      </Table.Cell>
                      <Table.Cell align="center">
                        <Badge variant={statusConfig.color} size="sm">
                          {t(`purchaseOrders.status.${po.status}`)}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell align="center">
                        <ActionMenu items={getActionItems(po)} />
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
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
    </div>
  );
};

export default PurchaseOrders;
