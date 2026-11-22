import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  FileText,
  Building2,
  Calendar,
  IndianRupee,
  Plus,
  Trash2,
  Banknote,
  Shield,
  Package,
} from 'lucide-react';
import { tendersAPI, customersAPI, productsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, FormSection } from '../components/ui';

const TenderForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    organization: {
      name: '',
      type: 'government',
      address: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
    },
    customer: '',
    publishDate: '',
    submissionDeadline: '',
    openingDate: '',
    validityPeriod: 90,
    estimatedValue: '',
    quotedValue: '',
    emd: {
      required: false,
      amount: '',
      type: 'dd',
      bankName: '',
      instrumentNumber: '',
      instrumentDate: '',
      validUntil: '',
      status: 'pending',
    },
    securityDeposit: {
      required: false,
      amount: '',
      percentage: '',
      type: 'bank_guarantee',
      bankName: '',
      instrumentNumber: '',
      validUntil: '',
      status: 'pending',
    },
    items: [],
    status: 'draft',
    priority: 'medium',
    category: 'medical_equipment',
    source: '',
    referenceNumber: '',
    notes: '',
  });

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    if (isEditing) {
      fetchTender();
    }
  }, [id]);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll({ limit: 100 });
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 100 });
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchTender = async () => {
    try {
      setLoading(true);
      const response = await tendersAPI.getOne(id);
      if (response.data.success) {
        const tender = response.data.data;
        setFormData({
          ...tender,
          customer: tender.customer?._id || '',
          publishDate: tender.publishDate?.split('T')[0] || '',
          submissionDeadline: tender.submissionDeadline?.split('T')[0] || '',
          openingDate: tender.openingDate?.split('T')[0] || '',
          emd: {
            ...tender.emd,
            instrumentDate: tender.emd?.instrumentDate?.split('T')[0] || '',
            validUntil: tender.emd?.validUntil?.split('T')[0] || '',
          },
          securityDeposit: {
            ...tender.securityDeposit,
            validUntil: tender.securityDeposit?.validUntil?.split('T')[0] || '',
          },
          items: tender.items?.map(item => ({
            ...item,
            product: item.product?._id || item.product || '',
            deliverySchedule: item.deliverySchedule?.split('T')[0] || '',
          })) || [],
        });
      }
    } catch (error) {
      console.error('Error fetching tender:', error);
      toast.error('Failed to load tender');
      navigate('/tenders');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product: '',
          description: '',
          quantity: 1,
          unitPrice: '',
          deliverySchedule: '',
        },
      ],
    }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // Auto-calculate total price
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].totalPrice = (newItems[index].quantity || 0) * (newItems[index].unitPrice || 0);
    }

    // Auto-fill price from product
    if (field === 'product' && value) {
      const product = products.find(p => p._id === value);
      if (product) {
        newItems[index].unitPrice = product.unitPrice;
        newItems[index].totalPrice = (newItems[index].quantity || 1) * product.unitPrice;
      }
    }

    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.submissionDeadline || !formData.organization.name) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      setSaving(true);

      // Prepare data
      const submitData = {
        ...formData,
        estimatedValue: parseFloat(formData.estimatedValue) || 0,
        quotedValue: parseFloat(formData.quotedValue) || 0,
        emd: {
          ...formData.emd,
          amount: parseFloat(formData.emd.amount) || 0,
        },
        securityDeposit: {
          ...formData.securityDeposit,
          amount: parseFloat(formData.securityDeposit.amount) || 0,
          percentage: parseFloat(formData.securityDeposit.percentage) || 0,
        },
        items: formData.items.map(item => ({
          ...item,
          quantity: parseInt(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          totalPrice: parseFloat(item.totalPrice) || 0,
        })),
      };

      // Remove empty customer
      if (!submitData.customer) {
        delete submitData.customer;
      }

      if (isEditing) {
        await tendersAPI.update(id, submitData);
        toast.success('Tender updated successfully');
      } else {
        await tendersAPI.create(submitData);
        toast.success('Tender created successfully');
      }

      navigate('/tenders');
    } catch (error) {
      console.error('Error saving tender:', error);
      toast.error(error.response?.data?.message || 'Failed to save tender');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={isEditing ? 'Edit Tender' : 'New Tender'}
        subtitle={isEditing ? `Editing ${formData.tenderNumber || ''}` : 'Create a new tender entry'}
        actions={
          <Button variant="ghost" onClick={() => navigate('/tenders')} icon={ArrowLeft}>
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <Card.Content className="p-6">
            <Card.Title icon={FileText} subtitle="Basic tender details">
              Tender Information
            </Card.Title>

            <FormSection className="mt-4">
              <div className="md:col-span-2">
                <label className="label">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="input w-full"
                  required
                  placeholder="Enter tender title"
                />
              </div>

              <div>
                <label className="label">External Reference</label>
                <input
                  type="text"
                  name="referenceNumber"
                  value={formData.referenceNumber}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="e.g., GeM ID, CPPP Reference"
                />
              </div>

              <div>
                <label className="label">Source</label>
                <input
                  type="text"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="e.g., GeM, CPPP, Direct"
                />
              </div>

              <div>
                <label className="label">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="select w-full"
                >
                  <option value="medical_equipment">Medical Equipment</option>
                  <option value="surgical_instruments">Surgical Instruments</option>
                  <option value="hospital_furniture">Hospital Furniture</option>
                  <option value="consumables">Consumables</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="label">Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="select w-full"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="label">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="select w-full"
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="technical_evaluation">Technical Evaluation</option>
                  <option value="financial_evaluation">Financial Evaluation</option>
                  <option value="awarded">Awarded</option>
                  <option value="loa_received">LOA Received</option>
                  <option value="po_received">PO Received</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="label">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="input w-full"
                  rows={3}
                  placeholder="Tender description..."
                />
              </div>
            </FormSection>
          </Card.Content>
        </Card>

        {/* Organization Details */}
        <Card>
          <Card.Content className="p-6">
            <Card.Title icon={Building2} subtitle="Organization/Customer details">
              Organization
            </Card.Title>

            <FormSection className="mt-4">
              <div>
                <label className="label">Organization Name *</label>
                <input
                  type="text"
                  name="organization.name"
                  value={formData.organization.name}
                  onChange={handleChange}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="label">Type</label>
                <select
                  name="organization.type"
                  value={formData.organization.type}
                  onChange={handleChange}
                  className="select w-full"
                >
                  <option value="government">Government</option>
                  <option value="semi_government">Semi-Government</option>
                  <option value="private">Private</option>
                  <option value="hospital">Hospital</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="label">Link to Customer</label>
                <select
                  name="customer"
                  value={formData.customer}
                  onChange={handleChange}
                  className="select w-full"
                >
                  <option value="">Select Customer (Optional)</option>
                  {customers.map(customer => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Contact Person</label>
                <input
                  type="text"
                  name="organization.contactPerson"
                  value={formData.organization.contactPerson}
                  onChange={handleChange}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="label">Contact Phone</label>
                <input
                  type="tel"
                  name="organization.contactPhone"
                  value={formData.organization.contactPhone}
                  onChange={handleChange}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="label">Contact Email</label>
                <input
                  type="email"
                  name="organization.contactEmail"
                  value={formData.organization.contactEmail}
                  onChange={handleChange}
                  className="input w-full"
                />
              </div>

              <div className="md:col-span-3">
                <label className="label">Address</label>
                <textarea
                  name="organization.address"
                  value={formData.organization.address}
                  onChange={handleChange}
                  className="input w-full"
                  rows={2}
                />
              </div>
            </FormSection>
          </Card.Content>
        </Card>

        {/* Dates & Value */}
        <Card>
          <Card.Content className="p-6">
            <Card.Title icon={Calendar} subtitle="Important dates and values">
              Dates & Financials
            </Card.Title>

            <FormSection className="mt-4">
              <div>
                <label className="label">Publish Date</label>
                <input
                  type="date"
                  name="publishDate"
                  value={formData.publishDate}
                  onChange={handleChange}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="label">Submission Deadline *</label>
                <input
                  type="date"
                  name="submissionDeadline"
                  value={formData.submissionDeadline}
                  onChange={handleChange}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="label">Opening Date</label>
                <input
                  type="date"
                  name="openingDate"
                  value={formData.openingDate}
                  onChange={handleChange}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="label">Validity Period (Days)</label>
                <input
                  type="number"
                  name="validityPeriod"
                  value={formData.validityPeriod}
                  onChange={handleChange}
                  className="input w-full"
                  min="1"
                />
              </div>

              <div>
                <label className="label">Estimated Value (₹)</label>
                <input
                  type="number"
                  name="estimatedValue"
                  value={formData.estimatedValue}
                  onChange={handleChange}
                  className="input w-full"
                  min="0"
                />
              </div>

              <div>
                <label className="label">Quoted Value (₹)</label>
                <input
                  type="number"
                  name="quotedValue"
                  value={formData.quotedValue}
                  onChange={handleChange}
                  className="input w-full"
                  min="0"
                />
              </div>
            </FormSection>
          </Card.Content>
        </Card>

        {/* EMD */}
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Card.Title icon={Banknote} subtitle="Earnest Money Deposit details">
                EMD (Earnest Money Deposit)
              </Card.Title>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="emd.required"
                  checked={formData.emd.required}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-secondary-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-secondary-600">EMD Required</span>
              </label>
            </div>

            {formData.emd.required && (
              <FormSection>
                <div>
                  <label className="label">Amount (₹)</label>
                  <input
                    type="number"
                    name="emd.amount"
                    value={formData.emd.amount}
                    onChange={handleChange}
                    className="input w-full"
                    min="0"
                  />
                </div>

                <div>
                  <label className="label">Type</label>
                  <select
                    name="emd.type"
                    value={formData.emd.type}
                    onChange={handleChange}
                    className="select w-full"
                  >
                    <option value="cash">Cash</option>
                    <option value="dd">Demand Draft</option>
                    <option value="bank_guarantee">Bank Guarantee</option>
                    <option value="online">Online Payment</option>
                    <option value="exempted">Exempted</option>
                  </select>
                </div>

                <div>
                  <label className="label">Status</label>
                  <select
                    name="emd.status"
                    value={formData.emd.status}
                    onChange={handleChange}
                    className="select w-full"
                  >
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="refunded">Refunded</option>
                    <option value="forfeited">Forfeited</option>
                    <option value="exempted">Exempted</option>
                  </select>
                </div>

                <div>
                  <label className="label">Bank Name</label>
                  <input
                    type="text"
                    name="emd.bankName"
                    value={formData.emd.bankName}
                    onChange={handleChange}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="label">Instrument Number</label>
                  <input
                    type="text"
                    name="emd.instrumentNumber"
                    value={formData.emd.instrumentNumber}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder="DD/BG Number"
                  />
                </div>

                <div>
                  <label className="label">Valid Until</label>
                  <input
                    type="date"
                    name="emd.validUntil"
                    value={formData.emd.validUntil}
                    onChange={handleChange}
                    className="input w-full"
                  />
                </div>
              </FormSection>
            )}
          </Card.Content>
        </Card>

        {/* Security Deposit */}
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Card.Title icon={Shield} subtitle="Security Deposit / Performance Guarantee">
                Security Deposit
              </Card.Title>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="securityDeposit.required"
                  checked={formData.securityDeposit.required}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-secondary-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-secondary-600">SD Required</span>
              </label>
            </div>

            {formData.securityDeposit.required && (
              <FormSection>
                <div>
                  <label className="label">Amount (₹)</label>
                  <input
                    type="number"
                    name="securityDeposit.amount"
                    value={formData.securityDeposit.amount}
                    onChange={handleChange}
                    className="input w-full"
                    min="0"
                  />
                </div>

                <div>
                  <label className="label">Percentage of Contract</label>
                  <input
                    type="number"
                    name="securityDeposit.percentage"
                    value={formData.securityDeposit.percentage}
                    onChange={handleChange}
                    className="input w-full"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="label">Type</label>
                  <select
                    name="securityDeposit.type"
                    value={formData.securityDeposit.type}
                    onChange={handleChange}
                    className="select w-full"
                  >
                    <option value="cash">Cash</option>
                    <option value="dd">Demand Draft</option>
                    <option value="bank_guarantee">Bank Guarantee</option>
                    <option value="online">Online Payment</option>
                    <option value="retention">Retention from Bills</option>
                  </select>
                </div>

                <div>
                  <label className="label">Status</label>
                  <select
                    name="securityDeposit.status"
                    value={formData.securityDeposit.status}
                    onChange={handleChange}
                    className="select w-full"
                  >
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="partial_refund">Partial Refund</option>
                    <option value="refunded">Refunded</option>
                    <option value="forfeited">Forfeited</option>
                  </select>
                </div>

                <div>
                  <label className="label">Bank Name</label>
                  <input
                    type="text"
                    name="securityDeposit.bankName"
                    value={formData.securityDeposit.bankName}
                    onChange={handleChange}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="label">Valid Until</label>
                  <input
                    type="date"
                    name="securityDeposit.validUntil"
                    value={formData.securityDeposit.validUntil}
                    onChange={handleChange}
                    className="input w-full"
                  />
                </div>
              </FormSection>
            )}
          </Card.Content>
        </Card>

        {/* Items */}
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Card.Title icon={Package} subtitle="Products/Items in this tender">
                Tender Items
              </Card.Title>
              <Button type="button" variant="ghost" size="sm" onClick={addItem} icon={Plus}>
                Add Item
              </Button>
            </div>

            {formData.items.length > 0 ? (
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="p-4 border border-secondary-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-2">
                        <label className="label">Product</label>
                        <select
                          value={item.product}
                          onChange={(e) => updateItem(index, 'product', e.target.value)}
                          className="select w-full"
                        >
                          <option value="">Select Product</option>
                          {products.map(product => (
                            <option key={product._id} value={product._id}>
                              {product.name} ({product.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="label">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="input w-full"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="label">Unit Price (₹)</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="input w-full"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="label">Total</label>
                        <input
                          type="text"
                          value={`₹${((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString('en-IN')}`}
                          className="input w-full bg-secondary-50"
                          disabled
                        />
                      </div>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          icon={Trash2}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="label">Description</label>
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="input w-full"
                          placeholder="Item description..."
                        />
                      </div>

                      <div>
                        <label className="label">Delivery Schedule</label>
                        <input
                          type="date"
                          value={item.deliverySchedule || ''}
                          onChange={(e) => updateItem(index, 'deliverySchedule', e.target.value)}
                          className="input w-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Items Total */}
                <div className="flex justify-end p-4 bg-secondary-50 rounded-lg">
                  <div className="text-right">
                    <p className="text-sm text-secondary-500">Total Items Value</p>
                    <p className="text-xl font-bold text-secondary">
                      ₹{formData.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-secondary-400">
                <Package size={48} className="mx-auto mb-2 opacity-50" />
                <p>No items added yet</p>
                <Button type="button" variant="ghost" size="sm" onClick={addItem} className="mt-2">
                  Add First Item
                </Button>
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Notes */}
        <Card>
          <Card.Content className="p-6">
            <label className="label">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="input w-full"
              rows={4}
              placeholder="Additional notes..."
            />
          </Card.Content>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/tenders')}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} icon={Save}>
            {isEditing ? 'Update Tender' : 'Create Tender'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TenderForm;
