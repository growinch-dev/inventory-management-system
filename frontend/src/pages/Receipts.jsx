import { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, Calendar, IndianRupee, Download } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';

const Receipts = () => {
  const [receipts, setReceipts] = useState([
    {
      id: 1,
      date: '2026-11-22',
      receiptNumber: 'RCP-001',
      customer: 'ABC Retailers',
      invoiceNumber: 'INV-2024-001',
      amount: 45000,
      paymentMode: 'bank_transfer',
      status: 'confirmed',
    },
    {
      id: 2,
      date: '2026-11-21',
      receiptNumber: 'RCP-002',
      customer: 'XYZ Distributors',
      invoiceNumber: 'INV-2024-002',
      amount: 78500,
      paymentMode: 'cheque',
      status: 'confirmed',
    },
    {
      id: 3,
      date: '2026-11-20',
      receiptNumber: 'RCP-003',
      customer: 'Paradise Hotel',
      invoiceNumber: 'INV-2024-003',
      amount: 32000,
      paymentMode: 'online',
      status: 'confirmed',
    },
    {
      id: 4,
      date: '2026-11-19',
      receiptNumber: 'RCP-004',
      customer: 'Tech Corp',
      invoiceNumber: 'INV-2024-004',
      amount: 15000,
      paymentMode: 'cash',
      status: 'pending',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);

  const paymentModes = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'online', label: 'Online Payment' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'upi', label: 'UPI' },
  ];

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    customer: '',
    invoiceNumber: '',
    amount: '',
    paymentMode: 'cash',
    transactionId: '',
    notes: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddReceipt = () => {
    setCurrentReceipt(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      customer: '',
      invoiceNumber: '',
      amount: '',
      paymentMode: 'cash',
      transactionId: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleEditReceipt = (receipt) => {
    setCurrentReceipt(receipt);
    setFormData({
      date: receipt.date,
      customer: receipt.customer,
      invoiceNumber: receipt.invoiceNumber,
      amount: receipt.amount,
      paymentMode: receipt.paymentMode,
      transactionId: receipt.transactionId || '',
      notes: receipt.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteReceipt = (id) => {
    if (window.confirm('Are you sure you want to delete this receipt?')) {
      setReceipts(receipts.filter(rec => rec.id !== id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (currentReceipt) {
      // Update existing receipt
      setReceipts(receipts.map(rec =>
        rec.id === currentReceipt.id
          ? {
              ...formData,
              id: rec.id,
              receiptNumber: rec.receiptNumber,
              status: 'confirmed'
            }
          : rec
      ));
    } else {
      // Add new receipt
      const newReceiptNumber = `RCP-${String(receipts.length + 1).padStart(3, '0')}`;
      setReceipts([
        ...receipts,
        {
          ...formData,
          id: receipts.length + 1,
          receiptNumber: newReceiptNumber,
          status: 'confirmed',
        }
      ]);
    }

    setIsModalOpen(false);
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch =
      receipt.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalReceipts = filteredReceipts.reduce((sum, rec) => sum + rec.amount, 0);

  const getPaymentModeLabel = (value) => {
    return paymentModes.find(mode => mode.value === value)?.label || value;
  };

  const handleDownloadReceipt = (receipt) => {
    // Create a printable receipt format
    const printWindow = window.open('', '_blank');
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receipt.receiptNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              color: #333;
              margin-bottom: 5px;
            }
            .receipt-title {
              font-size: 24px;
              color: #666;
              margin-top: 10px;
            }
            .receipt-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .info-block {
              flex: 1;
            }
            .info-label {
              font-weight: bold;
              color: #666;
              font-size: 12px;
              text-transform: uppercase;
            }
            .info-value {
              font-size: 14px;
              margin-top: 5px;
              color: #333;
            }
            .receipt-details {
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 30px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #eee;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: 600;
              color: #666;
            }
            .detail-value {
              color: #333;
            }
            .amount-section {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin-top: 20px;
            }
            .total-amount {
              display: flex;
              justify-content: space-between;
              font-size: 24px;
              font-weight: bold;
              color: #059669;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .signature-section {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #333;
              margin-top: 50px;
              padding-top: 10px;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body {
                padding: 20px;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">GrowInch</div>
            <div style="color: #666; font-size: 14px;">Mineral Water Manufacturing</div>
            <div class="receipt-title">PAYMENT RECEIPT</div>
          </div>

          <div class="receipt-info">
            <div class="info-block">
              <div class="info-label">Receipt No.</div>
              <div class="info-value">${receipt.receiptNumber}</div>
            </div>
            <div class="info-block" style="text-align: right;">
              <div class="info-label">Date</div>
              <div class="info-value">${new Date(receipt.date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</div>
            </div>
          </div>

          <div class="receipt-details">
            <div class="detail-row">
              <span class="detail-label">Received From:</span>
              <span class="detail-value">${receipt.customer}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Invoice Number:</span>
              <span class="detail-value">${receipt.invoiceNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment Mode:</span>
              <span class="detail-value">${getPaymentModeLabel(receipt.paymentMode)}</span>
            </div>
            ${receipt.transactionId ? `
            <div class="detail-row">
              <span class="detail-label">Transaction ID:</span>
              <span class="detail-value">${receipt.transactionId}</span>
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value" style="color: #059669; font-weight: 600;">
                ${receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
              </span>
            </div>
          </div>

          <div class="amount-section">
            <div class="total-amount">
              <span>Amount Received:</span>
              <span>₹${receipt.amount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          ${receipt.notes ? `
          <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <div style="font-weight: 600; color: #666; margin-bottom: 8px;">Notes:</div>
            <div style="color: #333;">${receipt.notes}</div>
          </div>
          ` : ''}

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line">Authorized Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Customer Signature</div>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your payment!</p>
            <p style="margin-top: 10px;">This is a computer-generated receipt.</p>
          </div>

          <div class="no-print" style="text-align: center; margin-top: 30px;">
            <button onclick="window.print()" style="
              background: #6366F1;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 14px;
              cursor: pointer;
              margin-right: 10px;
            ">
              Print Receipt
            </button>
            <button onclick="window.close()" style="
              background: #64748B;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 14px;
              cursor: pointer;
            ">
              Close
            </button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Payment Receipts</h1>
          <p className="text-sm text-primary-600 mt-1">Track all customer payment receipts</p>
        </div>
        <Button onClick={handleAddReceipt} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Receipt
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-primary-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600">Total Receipts</p>
              <p className="text-2xl font-bold text-primary-900 mt-1">
                ₹{totalReceipts.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <IndianRupee className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-primary-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600">This Month</p>
              <p className="text-2xl font-bold text-primary-900 mt-1">
                ₹{totalReceipts.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-primary-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600">Total Entries</p>
              <p className="text-2xl font-bold text-primary-900 mt-1">
                {filteredReceipts.length}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Filter className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-primary-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600">Avg per Receipt</p>
              <p className="text-2xl font-bold text-primary-900 mt-1">
                ₹{filteredReceipts.length > 0 ? Math.round(totalReceipts / filteredReceipts.length).toLocaleString('en-IN') : 0}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <IndianRupee className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-primary-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              icon={Search}
              placeholder="Search receipts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="sm:w-64">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-primary-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-primary-200">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-900 uppercase tracking-wider">
                  Receipt No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-900 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-900 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-900 uppercase tracking-wider">
                  Invoice No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-900 uppercase tracking-wider">
                  Payment Mode
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-primary-900 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-900 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-primary-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-primary-200">
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-primary-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-900">
                    {receipt.receiptNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">
                    {new Date(receipt.date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">
                    {receipt.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600">
                    {receipt.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600">
                    {getPaymentModeLabel(receipt.paymentMode)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                    ₹{receipt.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      receipt.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditReceipt(receipt)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadReceipt(receipt)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReceipt(receipt.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Receipt Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentReceipt ? 'Edit Receipt' : 'Add New Receipt'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Receipt Date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />

            <Input
              label="Customer Name"
              name="customer"
              value={formData.customer}
              onChange={handleInputChange}
              placeholder="Enter customer name"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Invoice Number"
              name="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={handleInputChange}
              placeholder="e.g., INV-2024-001"
              required
            />

            <Input
              label="Amount"
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Payment Mode"
              name="paymentMode"
              value={formData.paymentMode}
              onChange={handleInputChange}
              required
            >
              {paymentModes.map(mode => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </Select>

            <Input
              label="Transaction ID / Cheque No."
              name="transactionId"
              value={formData.transactionId}
              onChange={handleInputChange}
              placeholder="Optional"
            />
          </div>

          <Textarea
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Optional notes..."
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {currentReceipt ? 'Update Receipt' : 'Add Receipt'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Receipts;
