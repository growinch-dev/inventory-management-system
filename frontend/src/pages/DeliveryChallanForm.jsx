import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Package,
  Truck,
  Building,
  User,
  MapPin,
} from 'lucide-react';
import { deliveryChallansAPI, productsAPI, customersAPI } from '../services/api';
import { Button, Input, Card, Select, LoadingSpinner, Textarea } from '../components/ui';
import toast from 'react-hot-toast';

const challanTypes = [
  { value: 'demo', label: 'Demo' },
  { value: 'approval', label: 'Approval Basis' },
  { value: 'job_work', label: 'Job Work' },
  { value: 'returnable', label: 'Returnable' },
  { value: 'non_returnable', label: 'Non-Returnable' },
  { value: 'sample', label: 'Sample' },
  { value: 'credit', label: 'Credit' },
];

const transportModes = [
  { value: 'road', label: 'By Road' },
  { value: 'rail', label: 'By Rail' },
  { value: 'air', label: 'By Air' },
  { value: 'courier', label: 'Courier' },
  { value: 'hand_delivery', label: 'Hand Delivery' },
  { value: 'other', label: 'Other' },
];

const DeliveryChallanForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [formData, setFormData] = useState({
    challanType: 'returnable',
    challanDate: new Date().toISOString().split('T')[0],
    consignee: {
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      gstNumber: '',
    },
    deliveryAddress: {
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contactPerson: '',
      phone: '',
    },
    items: [],
    transportMode: 'road',
    transportDetails: {
      vehicleNumber: '',
      vehicleType: '',
      driverName: '',
      driverPhone: '',
      transporterName: '',
      lrNumber: '',
      eWayBillNumber: '',
    },
    expectedReturnDate: '',
    purpose: '',
    termsAndConditions: '1. Goods are sent on returnable basis.\n2. Any damage/loss will be charged.\n3. Subject to local jurisdiction.',
    remarks: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    if (isEdit) {
      fetchChallan();
    }
  }, [id]);

  const fetchChallan = async () => {
    try {
      setLoading(true);
      const { data } = await deliveryChallansAPI.getOne(id);
      const challan = data.data;

      setFormData({
        challanType: challan.challanType,
        challanDate: challan.challanDate?.split('T')[0] || '',
        consignee: challan.consignee || {},
        deliveryAddress: challan.deliveryAddress || {},
        items: challan.items.map(item => ({
          product: item.product?._id || item.product,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          serialNumbers: item.serialNumbers || [],
          batchNumber: item.batchNumber || '',
        })),
        transportMode: challan.transportMode || 'road',
        transportDetails: challan.transportDetails || {},
        expectedReturnDate: challan.expectedReturnDate?.split('T')[0] || '',
        purpose: challan.purpose || '',
        termsAndConditions: challan.termsAndConditions || '',
        remarks: challan.remarks || '',
      });
    } catch (error) {
      toast.error('Failed to fetch delivery challan');
      navigate('/delivery-challans');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await productsAPI.getAll({ limit: 100 });
      setProducts(data.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await customersAPI.getAll({ limit: 100 });
      setCustomers(data.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }));
  };

  const handleCustomerSelect = (customer) => {
    setFormData(prev => ({
      ...prev,
      consignee: {
        name: customer.name,
        address: customer.billingAddress?.street || '',
        city: customer.billingAddress?.city || '',
        state: customer.billingAddress?.state || '',
        pincode: customer.billingAddress?.pincode || '',
        phone: customer.phone || '',
        gstNumber: customer.gstNumber || '',
      },
    }));
  };

  const handleAddProduct = (product) => {
    const exists = formData.items.find(item => item.product === product._id);
    if (exists) {
      toast.error('Product already added');
      return;
    }

    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product: product._id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          unit: product.unit || 'PCS',
          rate: product.unitPrice || 0,
          serialNumbers: [],
          batchNumber: '',
        },
      ],
    }));
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const calculateTotal = () => {
    return formData.items.reduce(
      (sum, item) => sum + (item.quantity * item.rate),
      0
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.consignee.name) {
      toast.error('Please enter consignee name');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      setSaving(true);

      const submitData = {
        ...formData,
        items: formData.items.map(item => ({
          product: item.product,
          quantity: parseInt(item.quantity),
          unit: item.unit,
          rate: parseFloat(item.rate) || 0,
          serialNumbers: item.serialNumbers,
          batchNumber: item.batchNumber,
        })),
      };

      if (isEdit) {
        await deliveryChallansAPI.update(id, submitData);
        toast.success('Delivery Challan updated successfully');
      } else {
        await deliveryChallansAPI.create(submitData);
        toast.success('Delivery Challan created successfully');
      }

      navigate('/delivery-challans');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save delivery challan');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(
    product =>
      product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const isReturnable = ['demo', 'approval', 'job_work', 'returnable'].includes(formData.challanType);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/delivery-challans')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-secondary">
            {isEdit ? 'Edit Delivery Challan' : 'New Delivery Challan'}
          </h1>
          <p className="text-secondary-500 mt-1">
            {isEdit ? 'Update challan details' : 'Create a new delivery challan'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Challan Type & Date */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
            <Package size={20} className="text-primary" />
            Challan Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Challan Type *
              </label>
              <Select
                value={formData.challanType}
                onChange={(e) => handleChange('challanType', e.target.value)}
                required
              >
                {challanTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Challan Date *
              </label>
              <Input
                type="date"
                value={formData.challanDate}
                onChange={(e) => handleChange('challanDate', e.target.value)}
                required
              />
            </div>
            {isReturnable && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Expected Return Date
                </label>
                <Input
                  type="date"
                  value={formData.expectedReturnDate}
                  onChange={(e) => handleChange('expectedReturnDate', e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Purpose
            </label>
            <Input
              value={formData.purpose}
              onChange={(e) => handleChange('purpose', e.target.value)}
              placeholder="e.g., Demo for surgical procedure, Approval basis supply..."
            />
          </div>
        </Card>

        {/* Consignee Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
            <Building size={20} className="text-primary" />
            Consignee Details
          </h2>

          {/* Quick Customer Select */}
          {customers.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Select Existing Customer
              </label>
              <Select
                value=""
                onChange={(e) => {
                  const customer = customers.find(c => c._id === e.target.value);
                  if (customer) handleCustomerSelect(customer);
                }}
              >
                <option value="">-- Select Customer --</option>
                {customers.map(customer => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Name *
              </label>
              <Input
                value={formData.consignee.name}
                onChange={(e) => handleNestedChange('consignee', 'name', e.target.value)}
                placeholder="Company/Hospital name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Phone
              </label>
              <Input
                value={formData.consignee.phone}
                onChange={(e) => handleNestedChange('consignee', 'phone', e.target.value)}
                placeholder="Contact number"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Address
              </label>
              <Input
                value={formData.consignee.address}
                onChange={(e) => handleNestedChange('consignee', 'address', e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                City
              </label>
              <Input
                value={formData.consignee.city}
                onChange={(e) => handleNestedChange('consignee', 'city', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                State
              </label>
              <Input
                value={formData.consignee.state}
                onChange={(e) => handleNestedChange('consignee', 'state', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Pincode
              </label>
              <Input
                value={formData.consignee.pincode}
                onChange={(e) => handleNestedChange('consignee', 'pincode', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                GST Number
              </label>
              <Input
                value={formData.consignee.gstNumber}
                onChange={(e) => handleNestedChange('consignee', 'gstNumber', e.target.value)}
                placeholder="GST Number (optional)"
              />
            </div>
          </div>
        </Card>

        {/* Items */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
            <Package size={20} className="text-primary" />
            Items
          </h2>

          {/* Product Search */}
          <div className="relative mb-4">
            <Input
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setShowProductDropdown(true);
              }}
              onFocus={() => setShowProductDropdown(true)}
              placeholder="Search and add products..."
              icon={Search}
            />
            {showProductDropdown && productSearch && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-secondary-500">
                    No products found
                  </div>
                ) : (
                  filteredProducts.slice(0, 10).map(product => (
                    <div
                      key={product._id}
                      className="p-3 hover:bg-secondary-50 cursor-pointer flex justify-between items-center"
                      onClick={() => handleAddProduct(product)}
                    >
                      <div>
                        <p className="font-medium text-secondary">{product.name}</p>
                        <p className="text-sm text-secondary-500">SKU: {product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-secondary-600">Stock: {product.quantity}</p>
                        <p className="text-sm font-medium text-primary">
                          ₹{product.unitPrice?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Items Table */}
          {formData.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-sm font-semibold text-secondary-700">
                      Product
                    </th>
                    <th className="text-center px-4 py-2 text-sm font-semibold text-secondary-700 w-24">
                      Qty
                    </th>
                    <th className="text-center px-4 py-2 text-sm font-semibold text-secondary-700 w-24">
                      Unit
                    </th>
                    <th className="text-center px-4 py-2 text-sm font-semibold text-secondary-700 w-32">
                      Rate
                    </th>
                    <th className="text-right px-4 py-2 text-sm font-semibold text-secondary-700 w-32">
                      Amount
                    </th>
                    <th className="text-center px-4 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2">
                        <p className="font-medium text-secondary">{item.productName}</p>
                        <p className="text-sm text-secondary-500">SKU: {item.sku}</p>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, 'quantity', e.target.value)
                          }
                          className="text-center"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={item.unit}
                          onChange={(e) =>
                            handleItemChange(index, 'unit', e.target.value)
                          }
                          className="text-center"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) =>
                            handleItemChange(index, 'rate', e.target.value)
                          }
                          className="text-right"
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-secondary">
                        ₹{(item.quantity * item.rate).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="text-danger"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-secondary-50">
                  <tr>
                    <td colSpan="4" className="px-4 py-3 text-right font-semibold text-secondary">
                      Total Value:
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary text-lg">
                      ₹{calculateTotal().toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-secondary-500">
              <Package size={40} className="mx-auto mb-2 opacity-50" />
              <p>No items added yet. Search and add products above.</p>
            </div>
          )}
        </Card>

        {/* Transport Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
            <Truck size={20} className="text-primary" />
            Transport Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Transport Mode
              </label>
              <Select
                value={formData.transportMode}
                onChange={(e) => handleChange('transportMode', e.target.value)}
              >
                {transportModes.map(mode => (
                  <option key={mode.value} value={mode.value}>{mode.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Vehicle Number
              </label>
              <Input
                value={formData.transportDetails.vehicleNumber}
                onChange={(e) =>
                  handleNestedChange('transportDetails', 'vehicleNumber', e.target.value)
                }
                placeholder="e.g., DL 01 AB 1234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Transporter Name
              </label>
              <Input
                value={formData.transportDetails.transporterName}
                onChange={(e) =>
                  handleNestedChange('transportDetails', 'transporterName', e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Driver Name
              </label>
              <Input
                value={formData.transportDetails.driverName}
                onChange={(e) =>
                  handleNestedChange('transportDetails', 'driverName', e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Driver Phone
              </label>
              <Input
                value={formData.transportDetails.driverPhone}
                onChange={(e) =>
                  handleNestedChange('transportDetails', 'driverPhone', e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                LR Number
              </label>
              <Input
                value={formData.transportDetails.lrNumber}
                onChange={(e) =>
                  handleNestedChange('transportDetails', 'lrNumber', e.target.value)
                }
                placeholder="Lorry Receipt Number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                E-Way Bill Number
              </label>
              <Input
                value={formData.transportDetails.eWayBillNumber}
                onChange={(e) =>
                  handleNestedChange('transportDetails', 'eWayBillNumber', e.target.value)
                }
              />
            </div>
          </div>
        </Card>

        {/* Terms & Notes */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Terms & Conditions
              </label>
              <Textarea
                value={formData.termsAndConditions}
                onChange={(e) => handleChange('termsAndConditions', e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Remarks
              </label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                rows={4}
                placeholder="Additional remarks..."
              />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/delivery-challans')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : isEdit ? (
              'Update Challan'
            ) : (
              'Create Challan'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryChallanForm;
