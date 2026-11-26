import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  DollarSign,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { paymentsAPI, invoicesAPI } from '../services/api';
import { Button, Input, Card, Badge, LoadingSpinner, Select } from '../components/ui';
import toast from 'react-hot-toast';

const paymentMethodLabels = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  upi: 'UPI',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  neft: 'NEFT',
  rtgs: 'RTGS',
  imps: 'IMPS',
  dd: 'Demand Draft',
  other: 'Other',
};

const statusColors = {
  pending: 'warning',
  completed: 'success',
  failed: 'danger',
  refunded: 'info',
  cancelled: 'secondary',
};

const Payments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [outstanding, setOutstanding] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('payments');
  const [filters, setFilters] = useState({
    search: '',
    paymentType: 'received',
    status: '',
    paymentMethod: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Record Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    transactionReference: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'payments') {
      fetchPayments();
    }
    // Outstanding is needed for the summary card on both tabs.
    fetchOutstanding();
    fetchStats();
  }, [pagination.page, filters, activeTab]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        ),
      };
      const { data } = await paymentsAPI.getAll(params);
      setPayments(data.data);
      setPagination((prev) => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages,
      }));
    } catch (error) {
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutstanding = async () => {
    try {
      setLoading(true);
      const { data } = await paymentsAPI.getOutstanding();
      setOutstanding(data.data);
    } catch (error) {
      toast.error('Failed to fetch outstanding dues');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await paymentsAPI.getStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const searchInvoices = async (search) => {
    if (search.length < 2) return;
    try {
      const { data } = await invoicesAPI.getAll({
        search,
        status: 'delivered',
        limit: 10,
      });
      setInvoices(data.data);
    } catch (error) {
      console.error('Failed to search invoices');
    }
  };

  const handleSelectInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm((prev) => ({
      ...prev,
      amount: invoice.grandTotal.toString(),
    }));
    setInvoiceSearch('');
    setInvoices([]);
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) {
      toast.error('Please select an invoice');
      return;
    }
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setSubmitting(true);
      await paymentsAPI.create({
        referenceType: 'invoice',
        referenceId: selectedInvoice._id,
        amount: parseFloat(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        transactionReference: paymentForm.transactionReference,
        notes: paymentForm.notes,
        party: {
          type: 'customer',
          name: selectedInvoice.customer.name,
          phone: selectedInvoice.customer.phone,
        },
      });

      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setPaymentForm({
        amount: '',
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        transactionReference: '',
        notes: '',
      });
      fetchPayments();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getTodayReceived = () => {
    return stats?.todayReceived?.[0]?.total || 0;
  };

  const getThisMonthReceived = () => {
    return stats?.thisMonthReceived?.[0]?.total || 0;
  };

  const getPendingCheques = () => {
    return stats?.pendingCheques?.[0]?.total || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Payments</h1>
          <p className="text-secondary-500 mt-1">
            Track and manage payment collections
          </p>
        </div>
        <Button onClick={() => setShowPaymentModal(true)}>
          <Plus size={20} className="mr-2" />
          Record Payment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-success-light rounded-xl">
              <DollarSign size={20} className="text-success" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">Today</p>
              <p className="text-xl font-bold text-success">
                {formatCurrency(getTodayReceived())}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-50 rounded-xl">
              <TrendingUp size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">This Month</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(getThisMonthReceived())}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-warning-light rounded-xl">
              <Clock size={20} className="text-warning" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">Pending Cheques</p>
              <p className="text-xl font-bold text-warning">
                {formatCurrency(getPendingCheques())}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-danger-light rounded-xl">
              <AlertTriangle size={20} className="text-danger" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">Outstanding</p>
              <p className="text-xl font-bold text-danger">
                {formatCurrency(
                  outstanding.reduce((sum, o) => sum + o.balance, 0)
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-secondary-200">
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary-500 hover:text-secondary'
          }`}
        >
          Payment History
        </button>
        <button
          onClick={() => setActiveTab('outstanding')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'outstanding'
              ? 'border-primary text-primary'
              : 'border-transparent text-secondary-500 hover:text-secondary'
          }`}
        >
          Outstanding Dues
        </button>
      </div>

      {activeTab === 'payments' && (
        <>
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by payment number, reference..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  icon={Search}
                />
              </div>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full md:w-40"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </Select>
              <Select
                value={filters.paymentMethod}
                onChange={(e) =>
                  handleFilterChange('paymentMethod', e.target.value)
                }
                className="w-full md:w-40"
              >
                <option value="">All Methods</option>
                {Object.entries(paymentMethodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          {/* Payments Table */}
          <Card>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard
                  size={48}
                  className="mx-auto text-secondary-300 mb-4"
                />
                <p className="text-secondary-500">No payments found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead className="bg-secondary-50 border-b border-secondary-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                          Payment #
                        </th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                          Date
                        </th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                          Customer
                        </th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                          Invoice
                        </th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                          Method
                        </th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-secondary-700">
                          Amount
                        </th>
                        <th className="text-center px-4 py-3 text-sm font-semibold text-secondary-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {payments.map((payment) => (
                        <tr key={payment._id} className="hover:bg-secondary-50">
                          <td className="px-4 py-3 font-medium text-secondary whitespace-nowrap">
                            {payment.paymentNumber}
                          </td>
                          <td className="px-4 py-3 text-secondary-600">
                            {formatDate(payment.paymentDate)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-secondary">
                              {payment.party?.name}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {payment.referenceNumber && (
                              <Link
                                to={`/invoices/${payment.referenceId}`}
                                className="text-primary hover:underline whitespace-nowrap"
                              >
                                {payment.referenceNumber}
                              </Link>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" size="sm">
                              {paymentMethodLabels[payment.paymentMethod]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-success">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant={statusColors[payment.status]}
                              size="sm"
                            >
                              {payment.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-secondary-100">
                    <p className="text-sm text-secondary-500">
                      Showing{' '}
                      {(pagination.page - 1) * pagination.limit + 1} to{' '}
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}{' '}
                      of {pagination.total} results
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            page: prev.page - 1,
                          }))
                        }
                        disabled={pagination.page === 1}
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <span className="text-sm text-secondary-600">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            page: prev.page + 1,
                          }))
                        }
                        disabled={pagination.page === pagination.totalPages}
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}

      {activeTab === 'outstanding' && (
        <Card>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : outstanding.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle
                size={48}
                className="mx-auto text-success mb-4"
              />
              <p className="text-secondary-500">No outstanding dues</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-secondary-50 border-b border-secondary-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                      Invoice
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                      Customer
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                      Invoice Date
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                      Due Date
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-secondary-700">
                      Invoice Amt
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-secondary-700">
                      Paid
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-secondary-700">
                      Balance
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-secondary-700">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-secondary-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {outstanding.map((item) => (
                    <tr key={item.invoice._id} className="hover:bg-secondary-50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/invoices/${item.invoice._id}`}
                          className="font-medium text-primary hover:underline whitespace-nowrap"
                        >
                          {item.invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-secondary">
                          {item.customer?.name}
                        </p>
                        <p className="text-sm text-secondary-500">
                          {item.customer?.phone}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-secondary-600">
                        {formatDate(item.invoice.invoiceDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-secondary-400" />
                          <span
                            className={
                              item.isOverdue
                                ? 'text-danger font-medium'
                                : 'text-secondary-600'
                            }
                          >
                            {formatDate(item.invoice.dueDate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-secondary">
                        {formatCurrency(item.invoiceAmount)}
                      </td>
                      <td className="px-4 py-3 text-right text-success">
                        {formatCurrency(item.totalPaid)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-danger">
                        {formatCurrency(item.balance)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.isOverdue ? (
                          <Badge variant="danger" size="sm">
                            {item.daysOverdue} days overdue
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            Pending
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice({
                              _id: item.invoice._id,
                              invoiceNumber: item.invoice.invoiceNumber,
                              customer: item.customer,
                              grandTotal: item.balance,
                            });
                            setPaymentForm((prev) => ({
                              ...prev,
                              amount: item.balance.toString(),
                            }));
                            setShowPaymentModal(true);
                          }}
                        >
                          Record Payment
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-secondary">
                Record Payment
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedInvoice(null);
                }}
                className="text-secondary-400 hover:text-secondary"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Invoice Selection */}
              {!selectedInvoice ? (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Search Invoice
                  </label>
                  <div className="relative">
                    <Input
                      value={invoiceSearch}
                      onChange={(e) => {
                        setInvoiceSearch(e.target.value);
                        searchInvoices(e.target.value);
                      }}
                      placeholder="Search by invoice number or customer..."
                      icon={Search}
                    />
                    {invoices.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {invoices.map((invoice) => (
                          <div
                            key={invoice._id}
                            className="p-3 hover:bg-secondary-50 cursor-pointer border-b last:border-0"
                            onClick={() => handleSelectInvoice(invoice)}
                          >
                            <div className="flex justify-between">
                              <div>
                                <p className="font-medium text-secondary">
                                  {invoice.invoiceNumber}
                                </p>
                                <p className="text-sm text-secondary-500">
                                  {invoice.customer?.name}
                                </p>
                              </div>
                              <p className="font-medium text-primary">
                                {formatCurrency(invoice.grandTotal)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-secondary-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-secondary">
                        {selectedInvoice.invoiceNumber}
                      </p>
                      <p className="text-sm text-secondary-500">
                        {selectedInvoice.customer?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-primary">
                        {formatCurrency(selectedInvoice.grandTotal)}
                      </p>
                      <button
                        className="text-sm text-danger"
                        onClick={() => setSelectedInvoice(null)}
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Amount
                  </label>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Payment Date
                  </label>
                  <Input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        paymentDate: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Payment Method
                </label>
                <Select
                  value={paymentForm.paymentMethod}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      paymentMethod: e.target.value,
                    }))
                  }
                >
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Transaction Reference
                </label>
                <Input
                  value={paymentForm.transactionReference}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      transactionReference: e.target.value,
                    }))
                  }
                  placeholder="Cheque no. / UPI ID / Transaction ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Notes
                </label>
                <Input
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedInvoice(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleRecordPayment} disabled={submitting}>
                {submitting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <CheckCircle size={18} className="mr-2" />
                    Record Payment
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Payments;
