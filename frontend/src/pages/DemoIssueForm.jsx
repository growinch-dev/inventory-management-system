import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Package,
  Building2,
  Calendar,
  Plus,
  Trash2,
  User,
  Send,
} from 'lucide-react';
import { demoIssuesAPI, customersAPI, productsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, FormSection } from '../components/ui';

const DemoIssueForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [formData, setFormData] = useState({
    hospital: {
      name: '',
      department: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
    },
    contactPerson: {
      name: '',
      phone: '',
      email: '',
      designation: '',
    },
    customer: '',
    issueDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: '',
    items: [{ product: '', quantity: 1, serialNumbers: [] }],
    purpose: 'demo',
    purposeDescription: '',
    securityDeposit: {
      amount: '',
      received: false,
      paymentMethod: '',
      referenceNumber: '',
    },
    followUpRequired: true,
    followUpDate: '',
    internalNotes: '',
  });

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    if (isEditing) {
      fetchDemoIssue();
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

  const fetchDemoIssue = async () => {
    try {
      setLoading(true);
      const response = await demoIssuesAPI.getOne(id);
      if (response.data.success) {
        const issue = response.data.data;
        setFormData({
          ...issue,
          customer: issue.customer?._id || '',
          issueDate: issue.issueDate?.split('T')[0] || '',
          expectedReturnDate: issue.expectedReturnDate?.split('T')[0] || '',
          followUpDate: issue.followUpDate?.split('T')[0] || '',
          items: issue.items?.map(item => ({
            ...item,
            product: item.product?._id || item.product || '',
          })) || [{ product: '', quantity: 1, serialNumbers: [] }],
        });
      }
    } catch (error) {
      console.error('Error fetching demo issue:', error);
      toast.error('Failed to load demo issue');
      navigate('/demo-issues');
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

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer: customerId,
        hospital: {
          ...prev.hospital,
          name: customer.name,
          address: customer.billingAddress?.street || customer.address || '',
          city: customer.billingAddress?.city || '',
          state: customer.billingAddress?.state || '',
          pincode: customer.billingAddress?.pincode || '',
        },
        contactPerson: {
          ...prev.contactPerson,
          name: customer.contactPerson || '',
          phone: customer.phone || '',
          email: customer.email || '',
        },
      }));
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { product: '', quantity: 1, serialNumbers: [] },
      ],
    }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e, shouldIssue = false) => {
    e.preventDefault();

    if (!formData.hospital.name || !formData.expectedReturnDate) {
      toast.error('Please fill in required fields');
      return;
    }

    if (formData.items.length === 0 || !formData.items.some(i => i.product)) {
      toast.error('Please add at least one product');
      return;
    }

    try {
      if (shouldIssue) {
        setIssuing(true);
      } else {
        setSaving(true);
      }

      const submitData = {
        ...formData,
        items: formData.items.filter(i => i.product).map(item => ({
          ...item,
          quantity: parseInt(item.quantity) || 1,
        })),
        securityDeposit: {
          ...formData.securityDeposit,
          amount: parseFloat(formData.securityDeposit.amount) || 0,
        },
      };

      if (!submitData.customer) {
        delete submitData.customer;
      }

      let response;
      if (isEditing) {
        response = await demoIssuesAPI.update(id, submitData);
        toast.success('Demo issue updated successfully');
      } else {
        response = await demoIssuesAPI.create(submitData);
        toast.success('Demo issue created successfully');
      }

      // If shouldIssue, dispatch the items
      if (shouldIssue && response.data.data._id) {
        await demoIssuesAPI.issue(response.data.data._id, {});
        toast.success('Demo items issued successfully');
      }

      navigate('/demo-issues');
    } catch (error) {
      console.error('Error saving demo issue:', error);
      toast.error(error.response?.data?.message || 'Failed to save demo issue');
    } finally {
      setSaving(false);
      setIssuing(false);
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
        title={isEditing ? 'Edit Demo Issue' : 'New Demo Issue'}
        subtitle={isEditing ? `Editing ${formData.issueNumber || ''}` : 'Issue demo instruments to hospital'}
        actions={
          <Button variant="ghost" onClick={() => navigate('/demo-issues')} icon={ArrowLeft}>
            Back
          </Button>
        }
      />

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Hospital Details */}
        <Card>
          <Card.Content className="p-6">
            <Card.Title icon={Building2} subtitle="Hospital/Customer details">
              Hospital Information
            </Card.Title>

            <div className="mt-4 mb-4">
              <label className="label">Select Existing Customer</label>
              <select
                value={formData.customer}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                className="select w-full"
              >
                <option value="">Select Customer (Optional)</option>
                {customers.filter(c => ['hospital', 'clinic'].includes(c.customerType)).map(customer => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <FormSection>
              <div className="md:col-span-2">
                <label className="label">Hospital Name *</label>
                <input
                  type="text"
                  name="hospital.name"
                  value={formData.hospital.name}
                  onChange={handleChange}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="label">Department</label>
                <input
                  type="text"
                  name="hospital.department"
                  value={formData.hospital.department}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="e.g., Orthopedics"
                />
              </div>

              <div className="md:col-span-3">
                <label className="label">Address</label>
                <textarea
                  name="hospital.address"
                  value={formData.hospital.address}
                  onChange={handleChange}
                  className="input w-full"
                  rows={2}
                />
              </div>

              <div>
                <label className="label">City</label>
                <input
                  type="text"
                  name="hospital.city"
                  value={formData.hospital.city}
                  onChange={handleChange}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="label">State</label>
                <input
                  type="text"
                  name="hospital.state"
                  value={formData.hospital.state}
                  onChange={handleChange}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="label">Pincode</label>
                <input
                  type="text"
                  name="hospital.pincode"
                  value={formData.hospital.pincode}
                  onChange={handleChange}
                  className="input w-full"
                />
              </div>
            </FormSection>
          </Card.Content>
        </Card>

        {/* Contact Person */}
        <Card>
          <Card.Content className="p-6">
            <Card.Title icon={User} subtitle="Hospital contact details">
              Contact Person
            </Card.Title>

            <FormSection className="mt-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  name="contactPerson.name"
                  value={formData.contactPerson.name}
                  onChange={handleChange}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="label">Designation</label>
                <input
                  type="text"
                  name="contactPerson.designation"
                  value={formData.contactPerson.designation}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="e.g., HOD, Purchase Manager"
                />
              </div>

              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  name="contactPerson.phone"
                  value={formData.contactPerson.phone}
                  onChange={handleChange}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  name="contactPerson.email"
                  value={formData.contactPerson.email}
                  onChange={handleChange}
                  className="input w-full"
                />
              </div>
            </FormSection>
          </Card.Content>
        </Card>

        {/* Issue Details */}
        <Card>
          <Card.Content className="p-6">
            <Card.Title icon={Calendar} subtitle="Issue and return dates">
              Issue Details
            </Card.Title>

            <FormSection className="mt-4">
              <div>
                <label className="label">Purpose</label>
                <select
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleChange}
                  className="select w-full"
                >
                  <option value="demo">Demo</option>
                  <option value="trial">Trial</option>
                  <option value="evaluation">Evaluation</option>
                  <option value="training">Training</option>
                  <option value="exhibition">Exhibition</option>
                  <option value="loan">Loan</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="label">Issue Date *</label>
                <input
                  type="date"
                  name="issueDate"
                  value={formData.issueDate}
                  onChange={handleChange}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="label">Expected Return Date *</label>
                <input
                  type="date"
                  name="expectedReturnDate"
                  value={formData.expectedReturnDate}
                  onChange={handleChange}
                  className="input w-full"
                  required
                  min={formData.issueDate}
                />
              </div>

              <div className="md:col-span-3">
                <label className="label">Purpose Description</label>
                <textarea
                  name="purposeDescription"
                  value={formData.purposeDescription}
                  onChange={handleChange}
                  className="input w-full"
                  rows={2}
                  placeholder="Additional details about the demo purpose..."
                />
              </div>
            </FormSection>
          </Card.Content>
        </Card>

        {/* Items */}
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Card.Title icon={Package} subtitle="Products to be issued">
                Demo Items
              </Card.Title>
              <Button type="button" variant="ghost" size="sm" onClick={addItem} icon={Plus}>
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="p-4 border border-secondary-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6">
                      <label className="label">Product *</label>
                      <select
                        value={item.product}
                        onChange={(e) => updateItem(index, 'product', e.target.value)}
                        className="select w-full"
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map(product => (
                          <option key={product._id} value={product._id}>
                            {product.name} ({product.sku}) - Stock: {product.quantity}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="label">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="input w-full"
                        min="1"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="label">Serial Numbers</label>
                      <input
                        type="text"
                        value={item.serialNumbers?.join(', ') || ''}
                        onChange={(e) => updateItem(index, 'serialNumbers', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        className="input w-full"
                        placeholder="Comma separated"
                      />
                    </div>

                    <div className="md:col-span-1 flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        icon={Trash2}
                        className="text-red-500 hover:text-red-700"
                        disabled={formData.items.length === 1}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>

        {/* Security Deposit */}
        <Card>
          <Card.Content className="p-6">
            <Card.Title subtitle="Optional security deposit">
              Security Deposit
            </Card.Title>

            <FormSection className="mt-4">
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
                <label className="label">Payment Method</label>
                <select
                  name="securityDeposit.paymentMethod"
                  value={formData.securityDeposit.paymentMethod}
                  onChange={handleChange}
                  className="select w-full"
                >
                  <option value="">Select Method</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="label">Reference Number</label>
                <input
                  type="text"
                  name="securityDeposit.referenceNumber"
                  value={formData.securityDeposit.referenceNumber}
                  onChange={handleChange}
                  className="input w-full"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="depositReceived"
                  name="securityDeposit.received"
                  checked={formData.securityDeposit.received}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-secondary-300 text-primary focus:ring-primary"
                />
                <label htmlFor="depositReceived" className="text-sm text-secondary-600">
                  Deposit Received
                </label>
              </div>
            </FormSection>
          </Card.Content>
        </Card>

        {/* Follow-up */}
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="followUpRequired"
                  checked={formData.followUpRequired}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-secondary-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-secondary">Follow-up Required</span>
              </label>
            </div>

            {formData.followUpRequired && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Follow-up Date</label>
                  <input
                    type="date"
                    name="followUpDate"
                    value={formData.followUpDate}
                    onChange={handleChange}
                    className="input w-full"
                  />
                </div>
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Notes */}
        <Card>
          <Card.Content className="p-6">
            <label className="label">Internal Notes</label>
            <textarea
              name="internalNotes"
              value={formData.internalNotes}
              onChange={handleChange}
              className="input w-full"
              rows={3}
              placeholder="Internal notes (not visible to customer)..."
            />
          </Card.Content>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/demo-issues')}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} icon={Save}>
            {isEditing ? 'Update' : 'Save as Draft'}
          </Button>
          {!isEditing && (
            <Button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              loading={issuing}
              icon={Send}
            >
              Save & Issue
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default DemoIssueForm;
