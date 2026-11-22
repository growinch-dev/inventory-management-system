import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Mail,
  Printer,
  Edit,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { invoicesAPI } from '../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_CONFIG = {
  draft: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Draft' },
  sent: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Sent' },
  paid: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100', label: 'Paid' },
  overdue: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100', label: 'Overdue' },
  cancelled: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Cancelled' },
};

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoiceRef = useRef(null);

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoicesAPI.getOne(id);
      setInvoice(response.data.data);
    } catch (error) {
      toast.error('Failed to load invoice');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      setUpdating(true);
      await invoicesAPI.updateStatus(id, status);
      toast.success(`Invoice marked as ${status}`);
      fetchInvoice();
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('MAJOR SURGICAL CO.', 20, 25);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('4686, Nai Sarak, Delhi - 110006, India', 20, 32);
    doc.text('GSTIN: 07AABCM1234A1Z5', 20, 37);
    doc.text('Phone: +91-11-23456789', 20, 42);

    // Invoice Title
    doc.setFontSize(24);
    doc.setTextColor(5, 150, 105);
    doc.text('TAX INVOICE', 140, 25);

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 140, 35);
    doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 140, 41);
    if (invoice.dueDate) {
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 140, 47);
    }

    // Bill To
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text('BILL TO:', 20, 60);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.text(invoice.customer.name, 20, 67);
    doc.setFontSize(10);
    doc.text(invoice.customer.address || '', 20, 73);
    doc.text(`${invoice.customer.city || ''}, ${invoice.customer.state || ''} ${invoice.customer.pincode || ''}`, 20, 79);
    if (invoice.customer.gstNumber) {
      doc.text(`GSTIN: ${invoice.customer.gstNumber}`, 20, 85);
    }

    // Items Table
    const tableData = invoice.items.map((item, index) => [
      index + 1,
      item.productName || item.name || '',
      item.hsnCode || item.hsn || '-',
      item.quantity,
      `₹${(item.rate || item.unitPrice || 0).toLocaleString('en-IN')}`,
      `${item.taxRate || 0}%`,
      `₹${(item.totalAmount || item.total || 0).toLocaleString('en-IN')}`,
    ]);

    autoTable(doc, {
      startY: 95,
      head: [['#', 'Description', 'HSN', 'Qty', 'Unit Price', 'Tax', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [5, 150, 105],
        textColor: 255,
        fontSize: 10,
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 60 },
        2: { cellWidth: 20 },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 15, halign: 'center' },
        6: { cellWidth: 30, halign: 'right' },
      },
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    // Totals
    const totalsX = 130;
    const igstAmount = invoice.taxBreakdown?.igst?.amount || 0;
    const cgstAmount = invoice.taxBreakdown?.cgst?.amount || 0;
    const sgstAmount = invoice.taxBreakdown?.sgst?.amount || 0;

    doc.setFontSize(10);
    doc.text('Subtotal:', totalsX, finalY);
    doc.text(`₹${(invoice.subtotal || 0).toLocaleString('en-IN')}`, 180, finalY, { align: 'right' });

    if (igstAmount > 0) {
      doc.text('IGST:', totalsX, finalY + 6);
      doc.text(`₹${igstAmount.toLocaleString('en-IN')}`, 180, finalY + 6, { align: 'right' });
    } else {
      doc.text('CGST:', totalsX, finalY + 6);
      doc.text(`₹${cgstAmount.toLocaleString('en-IN')}`, 180, finalY + 6, { align: 'right' });
      doc.text('SGST:', totalsX, finalY + 12);
      doc.text(`₹${sgstAmount.toLocaleString('en-IN')}`, 180, finalY + 12, { align: 'right' });
    }

    const grandTotalY = igstAmount > 0 ? finalY + 14 : finalY + 20;
    doc.setDrawColor(200);
    doc.line(totalsX, grandTotalY, 190, grandTotalY);

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Grand Total:', totalsX, grandTotalY + 7);
    doc.setTextColor(5, 150, 105);
    doc.text(`₹${invoice.grandTotal.toLocaleString('en-IN')}`, 180, grandTotalY + 7, { align: 'right' });

    // Amount in words
    if (invoice.amountInWords) {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Amount in words: ${invoice.amountInWords}`, 20, grandTotalY + 20);
    }

    // Bank Details
    const bankY = grandTotalY + 35;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Bank Details:', 20, bankY);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.text('Bank: State Bank of India', 20, bankY + 6);
    doc.text('A/C No: 1234567890', 20, bankY + 11);
    doc.text('IFSC: SBIN0001234', 20, bankY + 16);
    doc.text('Branch: Chandni Chowk, Delhi', 20, bankY + 21);

    // Terms
    if (invoice.terms) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Terms & Conditions:', 20, bankY + 35);
      doc.setFontSize(8);
      doc.text(invoice.terms, 20, bankY + 41);
    }

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('This is a computer generated invoice.', 105, 280, { align: 'center' });
    doc.text('For Major Surgical Co.', 160, 260);
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('Authorized Signatory', 160, 275);

    // Save PDF
    doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
    toast.success('PDF downloaded successfully');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invoice) return null;

  const StatusIcon = STATUS_CONFIG[invoice.status]?.icon || Clock;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoices')} className="btn-secondary !p-2">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-heading font-bold text-secondary">
              Invoice #{invoice.invoiceNumber}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${STATUS_CONFIG[invoice.status]?.bg} ${STATUS_CONFIG[invoice.status]?.color}`}>
                <StatusIcon size={14} />
                {STATUS_CONFIG[invoice.status]?.label}
              </span>
              <span className="text-gray-500">
                {new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {invoice.status === 'draft' && (
            <button
              onClick={() => navigate(`/invoices/${id}/edit`)}
              className="btn-secondary"
            >
              <Edit size={18} className="mr-2" />
              Edit
            </button>
          )}
          <button onClick={handlePrint} className="btn-secondary">
            <Printer size={18} className="mr-2" />
            Print
          </button>
          <button onClick={generatePDF} className="btn-secondary">
            <Download size={18} className="mr-2" />
            Download PDF
          </button>
          {invoice.status === 'sent' && (
            <button
              onClick={() => handleStatusUpdate('paid')}
              disabled={updating}
              className="btn-primary"
            >
              {updating ? <Loader2 className="animate-spin mr-2" size={18} /> : <CheckCircle size={18} className="mr-2" />}
              Mark as Paid
            </button>
          )}
          {invoice.status === 'draft' && (
            <button
              onClick={() => handleStatusUpdate('sent')}
              disabled={updating}
              className="btn-primary"
            >
              {updating ? <Loader2 className="animate-spin mr-2" size={18} /> : <Mail size={18} className="mr-2" />}
              Mark as Sent
            </button>
          )}
        </div>
      </div>

      {/* Invoice Preview */}
      <div className="card p-8 print:shadow-none" ref={invoiceRef}>
        {/* Company Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-secondary">MAJOR SURGICAL CO.</h2>
            <p className="text-gray-600 mt-1">4686, Nai Sarak, Delhi - 110006, India</p>
            <p className="text-gray-600">GSTIN: 07AABCM1234A1Z5</p>
            <p className="text-gray-600">Phone: +91-11-23456789</p>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold text-primary">TAX INVOICE</h1>
            <p className="mt-2 text-gray-600">Invoice #: <span className="font-semibold text-secondary">{invoice.invoiceNumber}</span></p>
            <p className="text-gray-600">Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
            {invoice.dueDate && (
              <p className="text-gray-600">Due Date: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}</p>
            )}
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">BILL TO</h3>
          <h4 className="text-lg font-semibold text-secondary">{invoice.customer.name}</h4>
          {invoice.customer.address && <p className="text-gray-600">{invoice.customer.address}</p>}
          <p className="text-gray-600">
            {invoice.customer.city && `${invoice.customer.city}, `}
            {invoice.customer.state && `${invoice.customer.state} `}
            {invoice.customer.pincode}
          </p>
          {invoice.customer.gstNumber && (
            <p className="text-gray-600">GSTIN: {invoice.customer.gstNumber}</p>
          )}
          <p className="text-gray-600">{invoice.customer.email} | {invoice.customer.phone}</p>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">HSN</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Qty</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Unit Price</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Tax %</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-secondary">{item.productName || item.name || ''}</td>
                  <td className="px-4 py-3 text-gray-600">{item.hsnCode || item.hsn || '-'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-600">₹{(item.rate || item.unitPrice || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.taxRate || 0}%</td>
                  <td className="px-4 py-3 text-right font-semibold">₹{(item.totalAmount || item.total || 0).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₹{(invoice.subtotal || 0).toLocaleString('en-IN')}</span>
            </div>
            {(invoice.taxBreakdown?.igst?.amount || 0) > 0 ? (
              <div className="flex justify-between py-2">
                <span className="text-gray-600">IGST</span>
                <span className="font-medium">₹{(invoice.taxBreakdown?.igst?.amount || 0).toLocaleString('en-IN')}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">CGST</span>
                  <span className="font-medium">₹{(invoice.taxBreakdown?.cgst?.amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">SGST</span>
                  <span className="font-medium">₹{(invoice.taxBreakdown?.sgst?.amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </>
            )}
            <div className="flex justify-between py-3 border-t-2 border-gray-200 mt-2">
              <span className="text-lg font-bold text-secondary">Grand Total</span>
              <span className="text-xl font-bold text-primary">₹{(invoice.grandTotal || 0).toLocaleString('en-IN')}</span>
            </div>
            {invoice.amountInWords && (
              <p className="text-sm text-gray-500 mt-2">
                Amount in words: <span className="italic">{invoice.amountInWords}</span>
              </p>
            )}
          </div>
        </div>

        {/* Bank Details & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-200">
          <div>
            <h3 className="font-semibold text-secondary mb-2">Bank Details</h3>
            <p className="text-gray-600 text-sm">Bank: State Bank of India</p>
            <p className="text-gray-600 text-sm">A/C No: 1234567890</p>
            <p className="text-gray-600 text-sm">IFSC: SBIN0001234</p>
            <p className="text-gray-600 text-sm">Branch: Chandni Chowk, Delhi</p>
          </div>
          <div>
            {invoice.terms && (
              <>
                <h3 className="font-semibold text-secondary mb-2">Terms & Conditions</h3>
                <p className="text-gray-600 text-sm">{invoice.terms}</p>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex justify-between items-end">
          <p className="text-sm text-gray-400">This is a computer generated invoice.</p>
          <div className="text-right">
            <p className="text-gray-600 mb-8">For Major Surgical Co.</p>
            <p className="font-semibold text-secondary">Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="card p-6">
          <h3 className="font-semibold text-secondary mb-2">Notes</h3>
          <p className="text-gray-600">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetail;
