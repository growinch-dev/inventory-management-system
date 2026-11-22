import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  ShoppingCart,
  Building2,
  Package,
  Calendar,
  FileText,
  ScanLine,
} from 'lucide-react';
import { purchaseOrdersAPI, suppliersAPI, productsAPI, warehousesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, FormSection } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import BarcodeScanner from '../components/BarcodeScanner';

const PurchaseOrderForm = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [formData, setFormData] = useState({
    supplier: '',
    poDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    deliveryWarehouse: '',
    discountType: 'percentage',
    discountValue: 0,
    shippingCharges: 0,
    termsAndConditions: '',
    notes: '',
    items: [],
  });

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
    fetchWarehouses();
    if (isEditing) {
      fetchPurchaseOrder();
    }
  }, [id]);

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll({ limit: 100, isActive: true });
      setSuppliers(response.data.data);
    } catch (error) {
      toast.error('Failed to load suppliers');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 500, isActive: true });
      setProducts(response.data.data);
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehousesAPI.getList();
      setWarehouses(response.data.data);
      // Set default warehouse
      const defaultWarehouse = response.data.data.find((w) => w.isDefault);
      if (defaultWarehouse && !formData.deliveryWarehouse) {
        setFormData((prev) => ({ ...prev, deliveryWarehouse: defaultWarehouse._id }));
      }
    } catch (error) {
      console.error('Failed to load warehouses');
    }
  };

  const fetchPurchaseOrder = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrdersAPI.getOne(id);
      const po = response.data.data;
      setFormData({
        supplier: po.supplier?._id || po.supplier,
        poDate: po.poDate ? new Date(po.poDate).toISOString().split('T')[0] : '',
        expectedDeliveryDate: po.expectedDeliveryDate
          ? new Date(po.expectedDeliveryDate).toISOString().split('T')[0]
          : '',
        deliveryWarehouse: po.deliveryWarehouse?._id || po.deliveryWarehouse || '',
        discountType: po.discountType || 'percentage',
        discountValue: po.discountValue || 0,
        shippingCharges: po.shippingCharges || 0,
        termsAndConditions: po.termsAndConditions || '',
        notes: po.notes || '',
        items: po.items.map((item) => ({
          product: item.product?._id || item.product,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          rate: item.rate,
          taxRate: item.taxRate || 18,
          batchNumber: item.batchNumber || '',
          expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
        })),
      });
    } catch (error) {
      toast.error('Failed to load purchase order');
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSearch = (query) => {
    setProductSearch(query);
    if (query.length >= 2) {
      const filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.sku.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 10));
      setShowProductSearch(true);
    } else {
      setSearchResults([]);
      setShowProductSearch(false);
    }
  };

  const addProduct = (product) => {
    const existingIndex = formData.items.findIndex((item) => item.product === product._id);
    if (existingIndex >= 0) {
      const newItems = [...formData.items];
      newItems[existingIndex].quantity += 1;
      setFormData({ ...formData, items: newItems });
    } else {
      setFormData({
        ...formData,
        items: [
          ...formData.items,
          {
            product: product._id,
            productName: product.name,
            sku: product.sku,
            quantity: 1,
            rate: product.costPrice || product.unitPrice || 0,
            taxRate: product.taxRate || 18,
            batchNumber: '',
            expiryDate: '',
          },
        ],
      });
    }
    setProductSearch('');
    setShowProductSearch(false);
  };

  const handleBarcodeScan = async (code) => {
    try {
      let searchCode = code;
      let productId = null;

      // Check if the scanned code is a JSON QR code from our system
      // Format: {"type":"PRODUCT","id":"...","sku":"..."}
      try {
        const qrData = JSON.parse(code);
        if (qrData.type === 'PRODUCT') {
          searchCode = qrData.sku || code;
          productId = qrData.id;
        }
      } catch {
        // Not JSON, use the code as-is (regular barcode)
      }

      // First check if we already have this product in our local list
      const localProduct = products.find(
        (p) =>
          p._id === productId ||
          p.sku.toLowerCase() === searchCode.toLowerCase() ||
          p.barcode === searchCode
      );

      if (localProduct) {
        addProduct(localProduct);
        setShowScanner(false);
        toast.success(`Added: ${localProduct.name}`);
        return;
      }

      // If not found locally, try API lookup
      const response = await productsAPI.getBySku(searchCode);
      if (response.data.success && response.data.data) {
        addProduct(response.data.data);
        setShowScanner(false);
        toast.success(`Added: ${response.data.data.name}`);
      }
    } catch (error) {
      toast.error(`Product not found: ${code}`);
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce(
      (sum, item) => sum + item.quantity * item.rate,
      0
    );
    const totalTax = formData.items.reduce(
      (sum, item) => sum + (item.quantity * item.rate * item.taxRate) / 100,
      0
    );
    const discountAmount =
      formData.discountType === 'percentage'
        ? (subtotal * formData.discountValue) / 100
        : formData.discountValue;
    const grandTotal = subtotal - discountAmount + totalTax + (formData.shippingCharges || 0);

    return { subtotal, totalTax, discountAmount, grandTotal };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.supplier) {
      toast.error('Please select a supplier');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await purchaseOrdersAPI.update(id, formData);
        toast.success('Purchase order updated successfully');
      } else {
        await purchaseOrdersAPI.create(formData);
        toast.success('Purchase order created successfully');
      }
      navigate('/purchase-orders');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save purchase order');
    } finally {
      setSaving(false);
    }
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={isEditing ? t('purchaseOrders.editPO') : t('purchaseOrders.createPO')}
        subtitle={isEditing ? `Editing purchase order` : 'Create a new purchase order for procurement'}
        actions={
          <Button variant="ghost" onClick={() => navigate('/purchase-orders')} icon={ArrowLeft}>
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Supplier & Dates */}
        <Card>
          <Card.Content className="p-6">
            <FormSection icon={Building2} title="Supplier Information">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="label">{t('purchaseOrders.supplier')} *</label>
                  <select
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="select"
                    required
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">{t('purchaseOrders.poDate')} *</label>
                  <input
                    type="date"
                    value={formData.poDate}
                    onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">{t('purchaseOrders.expectedDelivery')}</label>
                  <input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="label">Delivery Warehouse</label>
                <select
                  value={formData.deliveryWarehouse}
                  onChange={(e) => setFormData({ ...formData, deliveryWarehouse: e.target.value })}
                  className="select w-full md:w-1/3"
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name} {w.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </FormSection>
          </Card.Content>
        </Card>

        {/* Items */}
        <Card>
          <Card.Content className="p-6">
            <Card.Title icon={Package} subtitle="Add products to your purchase order">
              Order Items
            </Card.Title>

            {/* Product Search & Scan */}
            <div className="flex gap-3 mb-4 mt-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => handleProductSearch(e.target.value)}
                  placeholder="Search products by name or SKU..."
                  className="input pl-10 w-full"
                />
                {showProductSearch && searchResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {searchResults.map((product) => (
                      <button
                        key={product._id}
                        type="button"
                        onClick={() => addProduct(product)}
                        className="w-full px-4 py-3 text-left hover:bg-secondary-50 flex items-center justify-between border-b border-secondary-100 last:border-0"
                      >
                        <div>
                          <p className="font-medium text-secondary">{product.name}</p>
                          <p className="text-xs text-secondary-500">{product.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-secondary">₹{product.costPrice || product.unitPrice}</p>
                          <p className="text-xs text-secondary-500">Stock: {product.quantity}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowScanner(true)}
                icon={ScanLine}
                className="whitespace-nowrap"
              >
                Scan Barcode
              </Button>
            </div>

            {/* Items Table */}
            {formData.items.length > 0 ? (
              <div className="border border-secondary-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-secondary-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider" style={{width: '90px'}}>Qty</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider" style={{width: '110px'}}>Rate (₹)</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider" style={{width: '80px'}}>Tax %</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider" style={{width: '120px'}}>Batch</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider" style={{width: '140px'}}>Expiry</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider" style={{width: '110px'}}>Amount</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-600 uppercase tracking-wider" style={{width: '50px'}}></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100 bg-white">
                      {formData.items.map((item, index) => (
                        <tr key={index} className="hover:bg-secondary-50/50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-secondary text-sm">{item.productName}</p>
                            <code className="text-xs text-secondary-400">{item.sku}</code>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 text-sm border border-secondary-200 rounded focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                              min="1"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 text-sm border border-secondary-200 rounded focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.taxRate}
                              onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 text-sm border border-secondary-200 rounded focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                              min="0"
                              max="100"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.batchNumber}
                              onChange={(e) => updateItem(index, 'batchNumber', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-secondary-200 rounded focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                              placeholder="Batch #"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) => updateItem(index, 'expiryDate', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-secondary-200 rounded focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-secondary text-sm tabular-nums">
                              ₹{(item.quantity * item.rate * (1 + item.taxRate / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-1.5 text-secondary-400 hover:text-danger hover:bg-red-50 rounded transition-colors"
                              title="Remove"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals - Inside the table container */}
                <div className="border-t border-secondary-200 bg-secondary-50 p-4">
                  <div className="flex flex-col md:flex-row md:justify-between gap-6">
                    {/* Discount & Shipping */}
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-secondary-600 whitespace-nowrap">{t('invoices.discount')}:</label>
                        <select
                          value={formData.discountType}
                          onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                          className="px-2 py-1.5 text-sm border border-secondary-200 rounded bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        >
                          <option value="percentage">%</option>
                          <option value="fixed">₹</option>
                        </select>
                        <input
                          type="number"
                          value={formData.discountValue}
                          onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-2 py-1.5 text-sm border border-secondary-200 rounded bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none text-right"
                          min="0"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-secondary-600 whitespace-nowrap">Shipping:</label>
                        <div className="flex items-center">
                          <span className="text-secondary-400 text-sm mr-1">₹</span>
                          <input
                            type="number"
                            value={formData.shippingCharges}
                            onChange={(e) => setFormData({ ...formData, shippingCharges: parseFloat(e.target.value) || 0 })}
                            className="w-24 px-2 py-1.5 text-sm border border-secondary-200 rounded bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none text-right"
                            min="0"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-secondary-600">{t('invoices.subtotal')}:</span>
                        <span className="font-medium tabular-nums">₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-secondary-600">{t('invoices.discount')}:</span>
                        <span className="font-medium tabular-nums text-danger">-₹{totals.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-secondary-600">Tax:</span>
                        <span className="font-medium tabular-nums">₹{totals.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between gap-2 pl-4 border-l-2 border-primary">
                        <span className="font-bold text-secondary">{t('invoices.grandTotal')}:</span>
                        <span className="font-bold text-primary text-lg tabular-nums">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-secondary-50 rounded-xl border-2 border-dashed border-secondary-200">
                <ShoppingCart size={48} className="mx-auto text-secondary-300 mb-3" />
                <p className="text-secondary-500 font-medium">No items added yet</p>
                <p className="text-sm text-secondary-400 mt-1">Search and add products using the search box above</p>
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Notes */}
        <Card>
          <Card.Content className="p-6">
            <FormSection icon={FileText} title="Additional Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="label">Terms & Conditions</label>
                  <textarea
                    value={formData.termsAndConditions}
                    onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                    rows={4}
                    className="input resize-none"
                    placeholder="Payment terms, delivery conditions..."
                  />
                </div>
                <div>
                  <label className="label">{t('common.notes')}</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="input resize-none"
                    placeholder="Internal notes..."
                  />
                </div>
              </div>
            </FormSection>
          </Card.Content>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/purchase-orders')}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={saving} icon={isEditing ? null : Plus}>
            {isEditing ? t('common.update') : t('common.create')} {t('purchaseOrders.title').slice(0, -1)}
          </Button>
        </div>
      </form>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
      />
    </div>
  );
};

export default PurchaseOrderForm;
