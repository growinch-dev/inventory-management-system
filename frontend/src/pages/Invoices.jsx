import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  FileText,
  Eye,
  Edit,
  Trash2,
  Copy,
  Download,
  Search,
  CheckCircle,
  Truck,
  PackageCheck,
} from 'lucide-react';
import { invoicesAPI } from '../services/api';
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
import { INVOICE_STATUSES, STATUS_COLORS } from '../constants';
import { useLanguage } from '../context/LanguageContext';

const Invoices = () => {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const statusOptions = [
    { value: '', label: t('common.all') + ' ' + t('common.status') },
    ...INVOICE_STATUSES.map(s => ({ ...s, label: t(`invoices.status.${s.value}`) })),
  ];

  useEffect(() => {
    fetchInvoices();
  }, [pagination.page, status]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 20,
        ...(search && { search }),
        ...(status && { status }),
      };
      const response = await invoicesAPI.getAll(params);
      setInvoices(response.data.data);
      setPagination({
        page: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.total,
      });
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
  };

  const handleSearchSubmit = () => {
    fetchInvoices();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;

    try {
      await invoicesAPI.delete(id);
      toast.success('Invoice deleted successfully');
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete invoice');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await invoicesAPI.duplicate(id);
      toast.success('Invoice duplicated successfully');
      fetchInvoices();
    } catch (error) {
      toast.error('Failed to duplicate invoice');
    }
  };

  const handleConfirm = async (id) => {
    try {
      await invoicesAPI.confirm(id);
      toast.success('Invoice confirmed - ready for dispatch');
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to confirm invoice');
    }
  };

  const handleDispatch = async (id) => {
    if (!window.confirm('Dispatch this invoice? Stock will be deducted from inventory.')) return;
    try {
      await invoicesAPI.dispatch(id);
      toast.success('Invoice dispatched - stock deducted successfully');
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to dispatch invoice');
    }
  };

  const handleDeliver = async (id) => {
    try {
      await invoicesAPI.deliver(id);
      toast.success('Invoice marked as delivered');
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update delivery status');
    }
  };

  const getActionItems = (invoice) => {
    const items = [
      { label: 'View', icon: Eye, href: `/invoices/${invoice._id}` },
    ];

    if (invoice.status === 'draft') {
      items.push(
        { label: 'Edit', icon: Edit, href: `/invoices/${invoice._id}/edit` },
        { label: 'Confirm', icon: CheckCircle, onClick: () => handleConfirm(invoice._id), variant: 'success' }
      );
    }

    if (invoice.status === 'draft' || invoice.status === 'confirmed') {
      items.push({ label: 'Dispatch', icon: Truck, onClick: () => handleDispatch(invoice._id), variant: 'warning' });
    }

    if (invoice.status === 'dispatched') {
      items.push({ label: 'Mark Delivered', icon: PackageCheck, onClick: () => handleDeliver(invoice._id), variant: 'success' });
    }

    items.push(
      { label: 'Duplicate', icon: Copy, onClick: () => handleDuplicate(invoice._id) },
      { label: 'Download PDF', icon: Download, onClick: () => {} }
    );

    if (!['paid', 'dispatched', 'delivered'].includes(invoice.status)) {
      items.push({ label: 'Delete', icon: Trash2, onClick: () => handleDelete(invoice._id), variant: 'danger' });
    }

    return items;
  };

  const getStatusVariant = (invoiceStatus) => {
    const colorMap = {
      draft: 'gray',
      confirmed: 'info',
      dispatched: 'warning',
      delivered: 'success',
      sent: 'info',
      paid: 'success',
      overdue: 'danger',
      cancelled: 'gray',
    };
    return colorMap[invoiceStatus] || 'gray';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={t('invoices.title')}
        subtitle={t('invoices.subtitle')}
        actions={
          <Button as={Link} to="/invoices/new" icon={Plus}>
            {t('invoices.createInvoice')}
          </Button>
        }
      />

      {/* Filters */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              placeholder="Search by invoice number, customer..."
              className="input pl-10"
            />
          </div>

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
        </div>
      </Card>

      {/* Invoices Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <LoadingSpinner.Container className="h-64" />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={search || status ? "No invoices match your filters" : "No invoices found"}
            description={search || status ? "Try adjusting your search or filters" : "Get started by creating your first invoice"}
            actionText="Create Invoice"
            actionLink="/invoices/new"
            actionIcon={Plus}
          />
        ) : (
          <>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.Header>Invoice #</Table.Header>
                  <Table.Header>Customer</Table.Header>
                  <Table.Header>Date</Table.Header>
                  <Table.Header align="right">Amount</Table.Header>
                  <Table.Header align="center">Status</Table.Header>
                  <Table.Header align="center" className="w-16">Actions</Table.Header>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {invoices.map((invoice, index) => (
                  <Table.Row
                    key={invoice._id}
                    className="group hover:bg-secondary-50/50 transition-colors"
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <Table.Cell>
                      <Link
                        to={`/invoices/${invoice._id}`}
                        className="font-semibold text-primary hover:text-primary-dark transition-colors"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <p className="font-medium text-secondary">{invoice.customer?.name}</p>
                      {invoice.customer?.email && (
                        <p className="text-xs text-secondary-500 truncate max-w-[180px]">{invoice.customer?.email}</p>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <time dateTime={invoice.invoiceDate} className="text-secondary">
                        {new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </time>
                      {invoice.dueDate && (
                        <p className={`text-xs ${
                          new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid'
                            ? 'text-danger font-medium'
                            : 'text-secondary-500'
                        }`}>
                          Due: <time dateTime={invoice.dueDate}>{new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</time>
                        </p>
                      )}
                    </Table.Cell>
                    <Table.Cell align="right">
                      <p className="font-semibold text-secondary tabular-nums">
                        ₹{invoice.grandTotal?.toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {invoice.items?.length || 0} {invoice.items?.length === 1 ? 'item' : 'items'}
                      </p>
                    </Table.Cell>
                    <Table.Cell align="center">
                      <Badge variant={getStatusVariant(invoice.status)} size="sm">
                        {invoice.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell align="center">
                      <ActionMenu items={getActionItems(invoice)} />
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
    </div>
  );
};

export default Invoices;
