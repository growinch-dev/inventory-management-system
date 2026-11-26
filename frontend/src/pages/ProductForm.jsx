import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, Printer } from 'lucide-react';
import { productsAPI, warehousesAPI, categoriesAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Textarea,
  LoadingSpinner,
} from '../components/ui';
import { PRODUCT_CATEGORIES, UNITS, TAX_RATES } from '../constants';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  // Managed categories from the Categories page, with the built-in list as fallback.
  const [categoryOptions, setCategoryOptions] = useState(PRODUCT_CATEGORIES);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: PRODUCT_CATEGORIES[0]?.value || 'mineral_water_500ml',
    productType: 'finished_good',
    brand: '',
    hsnCode: '',
    unitPrice: '',
    costPrice: '',
    quantity: 0,
    reorderLevel: 10,
    unit: 'PCS',
    batchNumber: '',
    barcode: '',
    manufacturingDate: '',
    expiryDate: '',
    taxRate: 18,
    warehouseRef: '',
    bottleSize: {
      size: '',
      unit: 'ml',
    },
  });

  useEffect(() => {
    fetchWarehouses();
    fetchCategories();
    if (isEdit) {
      fetchProduct();
    }
  }, [id]);

  const fetchWarehouses = async () => {
    try {
      const response = await warehousesAPI.getList();
      setWarehouses(response.data.data || []);
    } catch (error) {
      console.error('Failed to load warehouses');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      const cats = (response.data.data || [])
        .filter((c) => c.isActive !== false)
        .map((c) => ({ value: c.value, label: c.name }));
      if (cats.length) setCategoryOptions(cats);
    } catch (error) {
      // Keep the built-in PRODUCT_CATEGORIES fallback.
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getOne(id);
      const product = response.data.data;
      setFormData({
        ...product,
        unitPrice: product.unitPrice?.toString() || '',
        costPrice: product.costPrice?.toString() || '',
        warehouseRef: product.warehouseRef?._id || product.warehouseRef || '',
        manufacturingDate: product.manufacturingDate?.split('T')[0] || '',
        expiryDate: product.expiryDate?.split('T')[0] || '',
      });
    } catch (error) {
      toast.error('Failed to load product');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.unitPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      const data = {
        ...formData,
        unitPrice: parseFloat(formData.unitPrice),
        costPrice: parseFloat(formData.costPrice) || 0,
        quantity: parseInt(formData.quantity) || 0,
        reorderLevel: parseInt(formData.reorderLevel) || 10,
        taxRate: parseFloat(formData.taxRate) || 18,
      };

      if (isEdit) {
        await productsAPI.update(id, data);
        toast.success('Product updated successfully');
      } else {
        await productsAPI.create(data);
        toast.success('Product created successfully');
      }
      navigate('/products');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const warehouseOptions = [
    { value: '', label: 'Select Warehouse' },
    ...warehouses.map((w) => ({ value: w._id, label: w.name })),
  ];

  if (loading) {
    return <LoadingSpinner.Page />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={isEdit ? 'Edit Product' : 'Add New Product'}
        subtitle={isEdit ? 'Update product information' : 'Create a new product in your inventory'}
        backLink="/products"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <Card.Header>
            <Card.Title>Basic Information</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="md:col-span-2">
                <Input
                  label="Product Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <Input
                label="SKU"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="Auto-generated if empty"
                className="font-mono"
              />

              <Select
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                options={categoryOptions}
                placeholder="Select Category"
                required
              />

              <Input
                label="HSN Code"
                value={formData.hsnCode}
                onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                placeholder="e.g., 9018"
              />

              <Input
                label="Brand"
                value={formData.brand || ''}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., GrowInch, AquaPure"
              />

              <Select
                label="Product Type"
                value={formData.productType || 'finished_good'}
                onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                options={[
                  { value: 'finished_good', label: 'Finished Good' },
                  { value: 'raw_material', label: 'Raw Material' },
                  { value: 'work_in_progress', label: 'Work in Progress' },
                  { value: 'other', label: 'Other' },
                ]}
              />

              <div className="md:col-span-2">
                <Textarea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description (optional)"
                  rows={3}
                />
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Bottle Size (for water products) */}
        {formData.category?.includes('mineral_water') && (
          <Card>
            <Card.Header>
              <Card.Title>Bottle Specifications</Card.Title>
              <p className="text-sm text-secondary-500">Size details for water bottles</p>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <Input
                  label="Bottle Size"
                  type="number"
                  value={formData.bottleSize?.size || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    bottleSize: { ...formData.bottleSize, size: e.target.value }
                  })}
                  placeholder="e.g., 250, 500, 1000"
                  helperText="Size in ml or liters"
                />

                <Select
                  label="Size Unit"
                  value={formData.bottleSize?.unit || 'ml'}
                  onChange={(e) => setFormData({
                    ...formData,
                    bottleSize: { ...formData.bottleSize, unit: e.target.value }
                  })}
                  options={[
                    { value: 'ml', label: 'Milliliters (ml)' },
                    { value: 'l', label: 'Liters (l)' },
                  ]}
                />
              </div>
            </Card.Content>
          </Card>
        )}

        {/* Pricing & Stock */}
        <Card>
          <Card.Header>
            <Card.Title>Pricing & Stock</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Input
                label="Unit Price (₹)"
                type="number"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />

              <Input
                label="Cost Price (₹)"
                type="number"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
              />

              <Select
                label="Tax Rate (%)"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                options={TAX_RATES.map((t) => ({ value: t.value.toString(), label: t.label }))}
                placeholder="Select Tax Rate"
              />

              <Input
                label="Opening Quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                min="0"
                helperText={isEdit ? "Stock adjustments should be done via movements" : ""}
                disabled={isEdit}
              />

              <Input
                label="Reorder Level"
                type="number"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                min="0"
                helperText="Low stock alert threshold"
              />

              <Select
                label="Unit of Measure"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                options={UNITS}
                placeholder="Select Unit"
              />
            </div>
          </Card.Content>
        </Card>

        {/* Batch & Tracking Information */}
        <Card>
          <Card.Header>
            <Card.Title>Batch & Tracking</Card.Title>
            <p className="text-sm text-secondary-500">Batch tracking and product identification</p>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Input
                label="Barcode / UPC"
                value={formData.barcode || ''}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="e.g., 8901234567890"
                helperText="Scannable barcode"
              />

              <Input
                label="Batch Number"
                value={formData.batchNumber || ''}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value.toUpperCase() })}
                placeholder="e.g., BATCH-2024-001"
              />

              <Select
                label="Warehouse"
                value={formData.warehouseRef}
                onChange={(e) => setFormData({ ...formData, warehouseRef: e.target.value })}
                options={warehouseOptions}
                placeholder="Select Warehouse"
              />

              <Input
                label="Manufacturing Date"
                type="date"
                value={formData.manufacturingDate}
                onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
              />

              <Input
                label="Expiry Date"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                helperText="Best before date"
              />
            </div>
          </Card.Content>
        </Card>

        {/* QR Code Preview (for edit mode) */}
        {isEdit && formData.qrCode && (
          <Card>
            <Card.Header>
              <Card.Title>QR Code</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="flex items-center gap-6">
                <img
                  src={formData.qrCode}
                  alt={`QR Code for ${formData.name}`}
                  className="w-32 h-32 border rounded-lg"
                />
                <div>
                  <p className="text-sm text-secondary-500 mb-3">
                    Scan this QR code to quickly access product details or update stock.
                  </p>
                  <Button type="button" variant="secondary" size="sm" icon={Printer}>
                    Print QR Label
                  </Button>
                </div>
              </div>
            </Card.Content>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-secondary-100">
          <Button as={Link} to="/products" variant="secondary">
            Cancel
          </Button>
          <Button type="submit" loading={saving} icon={Save}>
            {isEdit ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
