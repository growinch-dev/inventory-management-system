import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Trash2,
  Search,
  QrCode,
  Calculator,
  Send,
  Save,
} from 'lucide-react';
import { invoicesAPI, customersAPI, productsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Textarea,
  Table,
  LoadingSpinner,
  EmptyState,
} from '../components/ui';
import { TAX_RATES } from '../constants';

const InvoiceForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [formData, setFormData] = useState({
    customer: '',
    customerName: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [],
    notes: '',
    terms: 'Payment due within 30 days of invoice date.',
    taxType: 'gst', // gst or igst
  });

  const [totals, setTotals] = useState({
    subtotal: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    grandTotal: 0,
  });

  useEffect(() => {
    if (isEdit) {
      fetchInvoice();
    }
    fetchCustomers();
    fetchProducts();
  }, [id]);

  useEffect(() => {
    calculateTotals();
  }, [formData.items, formData.taxType]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoicesAPI.getOne(id);
      const invoice = response.data.data;
      setFormData({
        customer: invoice.customer._id,
        customerName: invoice.customer.name,
        invoiceDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
        items: invoice.items.map((item) => ({
          product: item.product?._id || '',
          productName: item.name,
          hsn: item.hsn || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          total: item.total,
        })),
        notes: invoice.notes || '',
        terms: invoice.terms || '',
        taxType: invoice.igst > 0 ? 'igst' : 'gst',
      });
    } catch (error) {
      toast.error('Failed to load invoice');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll({ limit: 100 });
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch customers');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 100 });
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch products');
    }
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = formData.items.reduce((sum, item) => {
      const itemTax = (item.total || 0) * ((item.taxRate || 0) / 100);
      return sum + itemTax;
    }, 0);

    let cgst = 0, sgst = 0, igst = 0;
    if (formData.taxType === 'igst') {
      igst = taxAmount;
    } else {
      cgst = taxAmount / 2;
      sgst = taxAmount / 2;
    }

    setTotals({
      subtotal,
      cgst,
      sgst,
      igst,
      grandTotal: subtotal + taxAmount,
    });
  };

  const handleCustomerSelect = (customer) => {
    setFormData({
      ...formData,
      customer: customer._id,
      customerName: customer.name,
      taxType: customer.state?.toLowerCase() === 'delhi' ? 'gst' : 'igst',
    });
    setShowCustomerDropdown(false);
    setCustomerSearch('');
  };

  const handleProductAdd = (product) => {
    const existingIndex = formData.items.findIndex((item) => item.product === product._id);

    if (existingIndex >= 0) {
      const updatedItems = [...formData.items];
      updatedItems[existingIndex].quantity += 1;
      updatedItems[existingIndex].total =
        updatedItems[existingIndex].quantity * updatedItems[existingIndex].unitPrice;
      setFormData({ ...formData, items: updatedItems });
    } else {
      const newItem = {
        product: product._id,
        productName: product.name,
        hsn: product.hsnCode || '',
        quantity: 1,
        unitPrice: product.sellingPrice,
        taxRate: product.gstRate || 18,
        total: product.sellingPrice,
      };
      setFormData({ ...formData, items: [...formData.items, newItem] });
    }

    setShowProductDropdown(false);
    setProductSearch('');
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;

    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }

    setFormData({ ...formData, items: updatedItems });
  };

  const handleRemoveItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  const handleSubmit = async (e, status = 'draft') => {
    e.preventDefault();

    if (!formData.customer) {
      toast.error('Please select a customer');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      setSaving(true);
      const invoiceData = {
        customer: formData.customer,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate || null,
        items: formData.items.map((item) => ({
          product: item.product || null,
          name: item.productName,
          hsn: item.hsn,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          total: item.total,
        })),
        subtotal: totals.subtotal,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        grandTotal: totals.grandTotal,
        notes: formData.notes,
        terms: formData.terms,
        status,
      };

      if (isEdit) {
        await invoicesAPI.update(id, invoiceData);
        toast.success('Invoice updated successfully');
      } else {
        await invoicesAPI.create(invoiceData);
        toast.success('Invoice created successfully');
      }

      navigate('/invoices');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner.Page />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={isEdit ? 'Edit Invoice' : 'Create Invoice'}
        subtitle={isEdit ? 'Update invoice details' : 'Generate a new sales invoice'}
        backLink="/invoices"
      />

      <form onSubmit={(e) => handleSubmit(e, 'draft')}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Selection */}
            <Card>
              <Card.Header>
                <Card.Title>Customer Details</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="relative">
                  <label htmlFor="customer-search" className="block text-sm font-medium text-secondary mb-1.5">
                    Select Customer
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} aria-hidden="true" />
                    <input
                      id="customer-search"
                      type="text"
                      value={formData.customerName || customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setFormData({ ...formData, customer: '', customerName: '' });
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Search customers..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                      autoComplete="off"
                      aria-expanded={showCustomerDropdown && filteredCustomers.length > 0}
                      aria-haspopup="listbox"
                    />
                  </div>

                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <ul
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      role="listbox"
                    >
                      {filteredCustomers.map((customer) => (
                        <li key={customer._id} role="option">
                          <button
                            type="button"
                            onClick={() => handleCustomerSelect(customer)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 focus:bg-gray-50 focus:outline-none"
                          >
                            <p className="font-medium text-secondary">{customer.name}</p>
                            <p className="text-sm text-gray-500">{customer.email} • {customer.phone}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card.Content>
            </Card>

            {/* Invoice Items */}
            <Card>
              <Card.Header>
                <Card.Title>Invoice Items</Card.Title>
                <div className="flex gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder="Search products..."
                      className="w-48 sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors text-sm"
                      aria-label="Search products to add"
                    />

                    {showProductDropdown && productSearch && filteredProducts.length > 0 && (
                      <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto" role="listbox">
                        {filteredProducts.map((product) => (
                          <li key={product._id} role="option">
                            <button
                              type="button"
                              onClick={() => handleProductAdd(product)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 focus:bg-gray-50 focus:outline-none"
                            >
                              <p className="font-medium text-secondary">{product.name}</p>
                              <p className="text-sm text-gray-500">
                                SKU: {product.sku} • ₹{product.sellingPrice?.toLocaleString('en-IN')}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={QrCode}
                    as={Link}
                    to="/scanner"
                  >
                    Scan QR
                  </Button>
                </div>
              </Card.Header>
              <Card.Content className="p-0">
                {formData.items.length === 0 ? (
                  <EmptyState
                    icon={Calculator}
                    title="No items added yet"
                    description="Search for products or scan QR code to add items"
                    compact
                  />
                ) : (
                  <Table>
                    <Table.Head>
                      <Table.Row>
                        <Table.Header>Product</Table.Header>
                        <Table.Header>HSN</Table.Header>
                        <Table.Header align="center">Qty</Table.Header>
                        <Table.Header align="right">Unit Price</Table.Header>
                        <Table.Header align="center">Tax %</Table.Header>
                        <Table.Header align="right">Total</Table.Header>
                        <Table.Header className="w-12"></Table.Header>
                      </Table.Row>
                    </Table.Head>
                    <Table.Body>
                      {formData.items.map((item, index) => (
                        <Table.Row key={index}>
                          <Table.Cell>
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-primary focus:ring-1 focus:ring-primary/20"
                              aria-label={`Product name for item ${index + 1}`}
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <input
                              type="text"
                              value={item.hsn}
                              onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                              className="w-24 px-2 py-1.5 border border-gray-300 rounded focus:border-primary focus:ring-1 focus:ring-primary/20"
                              aria-label={`HSN code for item ${index + 1}`}
                            />
                          </Table.Cell>
                          <Table.Cell align="center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1.5 border border-gray-300 rounded text-center focus:border-primary focus:ring-1 focus:ring-primary/20"
                              aria-label={`Quantity for item ${index + 1}`}
                            />
                          </Table.Cell>
                          <Table.Cell align="right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-28 px-2 py-1.5 border border-gray-300 rounded text-right focus:border-primary focus:ring-1 focus:ring-primary/20"
                              aria-label={`Unit price for item ${index + 1}`}
                            />
                          </Table.Cell>
                          <Table.Cell align="center">
                            <select
                              value={item.taxRate}
                              onChange={(e) => handleItemChange(index, 'taxRate', parseFloat(e.target.value))}
                              className="w-20 px-2 py-1.5 border border-gray-300 rounded focus:border-primary focus:ring-1 focus:ring-primary/20"
                              aria-label={`Tax rate for item ${index + 1}`}
                            >
                              {TAX_RATES.map((rate) => (
                                <option key={rate.value} value={rate.value}>{rate.label}</option>
                              ))}
                            </select>
                          </Table.Cell>
                          <Table.Cell align="right" className="font-semibold">
                            ₹{item.total?.toLocaleString('en-IN')}
                          </Table.Cell>
                          <Table.Cell>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                              aria-label={`Remove item ${index + 1}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                )}
              </Card.Content>
            </Card>

            {/* Notes & Terms */}
            <Card>
              <Card.Header>
                <Card.Title>Additional Information</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <Textarea
                    label="Notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Additional notes for the customer..."
                  />
                  <Textarea
                    label="Terms & Conditions"
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    rows={3}
                  />
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Invoice Details */}
            <Card>
              <Card.Header>
                <Card.Title>Invoice Details</Card.Title>
              </Card.Header>
              <Card.Content className="space-y-4">
                <Input
                  label="Invoice Date"
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  required
                />
                <Input
                  label="Due Date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
                <Select
                  label="Tax Type"
                  value={formData.taxType}
                  onChange={(e) => setFormData({ ...formData, taxType: e.target.value })}
                  options={[
                    { value: 'gst', label: 'CGST + SGST (Within State)' },
                    { value: 'igst', label: 'IGST (Inter State)' },
                  ]}
                />
              </Card.Content>
            </Card>

            {/* Totals */}
            <Card>
              <Card.Header>
                <Card.Title>Summary</Card.Title>
              </Card.Header>
              <Card.Content>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Subtotal</dt>
                    <dd className="font-medium">₹{totals.subtotal.toLocaleString('en-IN')}</dd>
                  </div>
                  {formData.taxType === 'gst' ? (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">CGST</dt>
                        <dd className="font-medium">₹{totals.cgst.toLocaleString('en-IN')}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">SGST</dt>
                        <dd className="font-medium">₹{totals.sgst.toLocaleString('en-IN')}</dd>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <dt className="text-gray-600">IGST</dt>
                      <dd className="font-medium">₹{totals.igst.toLocaleString('en-IN')}</dd>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-3 flex justify-between">
                    <dt className="font-semibold text-secondary">Grand Total</dt>
                    <dd className="font-bold text-xl text-primary">
                      ₹{totals.grandTotal.toLocaleString('en-IN')}
                    </dd>
                  </div>
                </dl>
              </Card.Content>
            </Card>

            {/* Actions */}
            <Card padding="md">
              <div className="space-y-3">
                <Button
                  type="submit"
                  variant="secondary"
                  loading={saving}
                  icon={Save}
                  className="w-full"
                >
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e, 'sent')}
                  loading={saving}
                  icon={Send}
                  className="w-full"
                >
                  Save & Send
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;
