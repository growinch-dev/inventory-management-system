import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  Calendar,
  Building2,
  Truck,
} from 'lucide-react';
import { purchaseOrdersAPI, warehousesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, FormSection } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';

const PurchaseOrderReceive = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [notes, setNotes] = useState('');
  const [receivedItems, setReceivedItems] = useState([]);

  useEffect(() => {
    fetchPurchaseOrder();
    fetchWarehouses();
  }, [id]);

  const fetchPurchaseOrder = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrdersAPI.getOne(id);
      const po = response.data.data;
      setPurchaseOrder(po);

      // Initialize received items with pending quantities
      setReceivedItems(
        po.items.map((item) => ({
          product: item.product?._id || item.product,
          productName: item.productName,
          sku: item.sku,
          orderedQuantity: item.quantity,
          previouslyReceived: item.receivedQuantity || 0,
          pendingQuantity: item.quantity - (item.receivedQuantity || 0),
          quantity: item.quantity - (item.receivedQuantity || 0), // Default to pending
          batchNumber: item.batchNumber || '',
          lotNumber: '',
          manufacturingDate: '',
          expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
        }))
      );

      if (po.deliveryWarehouse) {
        setSelectedWarehouse(po.deliveryWarehouse._id || po.deliveryWarehouse);
      }
    } catch (error) {
      toast.error('Failed to load purchase order');
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehousesAPI.getList();
      setWarehouses(response.data.data);
    } catch (error) {
      console.error('Failed to load warehouses');
    }
  };

  const updateReceivedItem = (index, field, value) => {
    const newItems = [...receivedItems];
    newItems[index][field] = value;
    setReceivedItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Filter items that have quantity to receive
    const itemsToReceive = receivedItems.filter((item) => item.quantity > 0);

    if (itemsToReceive.length === 0) {
      toast.error('Please enter quantity for at least one item');
      return;
    }

    // Validate batch info for items with quantity
    for (const item of itemsToReceive) {
      if (!item.batchNumber) {
        toast.error(`Please enter batch number for ${item.productName}`);
        return;
      }
      if (!item.expiryDate) {
        toast.error(`Please enter expiry date for ${item.productName}`);
        return;
      }
    }

    try {
      setSaving(true);
      await purchaseOrdersAPI.receive(id, {
        receivedItems: itemsToReceive,
        warehouseId: selectedWarehouse,
        notes,
      });
      toast.success('Items received successfully');
      navigate('/purchase-orders');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to receive items');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!purchaseOrder) return null;

  const totalReceiving = receivedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={t('purchaseOrders.receive')}
        subtitle={`Receiving items for ${purchaseOrder.poNumber}`}
        actions={
          <Button variant="ghost" onClick={() => navigate('/purchase-orders')} icon={ArrowLeft}>
            Back
          </Button>
        }
      />

      {/* PO Info */}
      <Card>
        <Card.Content className="p-6">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                <Building2 size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-secondary-500">Supplier</p>
                <p className="font-semibold text-secondary">{purchaseOrder.supplierName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-info-50 rounded-xl flex items-center justify-center">
                <Calendar size={20} className="text-info" />
              </div>
              <div>
                <p className="text-xs text-secondary-500">PO Date</p>
                <p className="font-semibold text-secondary">
                  {new Date(purchaseOrder.poDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success-50 rounded-xl flex items-center justify-center">
                <Package size={20} className="text-success" />
              </div>
              <div>
                <p className="text-xs text-secondary-500">Total Items</p>
                <p className="font-semibold text-secondary">
                  {purchaseOrder.totalReceivedItems || 0} / {purchaseOrder.totalItems} received
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={purchaseOrder.status === 'partial' ? 'warning' : 'info'} size="lg">
                {t(`purchaseOrders.status.${purchaseOrder.status}`)}
              </Badge>
            </div>
          </div>
        </Card.Content>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Warehouse Selection */}
        <Card>
          <Card.Content className="p-6">
            <FormSection icon={Truck} title="Delivery Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="label">Receive at Warehouse *</label>
                  <select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    className="select"
                    required
                  >
                    <option value="">Select warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name} {w.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Receipt Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input"
                    placeholder="Delivery reference, vehicle number, etc."
                  />
                </div>
              </div>
            </FormSection>
          </Card.Content>
        </Card>

        {/* Items to Receive */}
        <Card>
          <Card.Content className="p-6">
            <FormSection icon={Package} title="Items to Receive">
              <div className="mt-4 border border-secondary-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-secondary-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-secondary-600">Product</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-secondary-600 w-20">Ordered</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-secondary-600 w-20">Received</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-secondary-600 w-24">Receive Qty</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-secondary-600 w-32">Batch # *</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-secondary-600 w-28">Lot #</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-secondary-600 w-32">Mfg Date</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-secondary-600 w-32">Expiry *</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivedItems.map((item, index) => (
                      <tr key={index} className="border-t border-secondary-100">
                        <td className="px-4 py-3">
                          <p className="font-medium text-secondary">{item.productName}</p>
                          <code className="text-xs text-secondary-500">{item.sku}</code>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-semibold text-secondary">{item.orderedQuantity}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`font-semibold ${item.previouslyReceived > 0 ? 'text-success' : 'text-secondary-400'}`}>
                            {item.previouslyReceived}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateReceivedItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="input text-center"
                            min="0"
                            max={item.pendingQuantity}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={item.batchNumber}
                            onChange={(e) => updateReceivedItem(index, 'batchNumber', e.target.value)}
                            className="input text-center"
                            placeholder="BATCH001"
                            required={item.quantity > 0}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={item.lotNumber}
                            onChange={(e) => updateReceivedItem(index, 'lotNumber', e.target.value)}
                            className="input text-center"
                            placeholder="LOT001"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="date"
                            value={item.manufacturingDate}
                            onChange={(e) => updateReceivedItem(index, 'manufacturingDate', e.target.value)}
                            className="input text-center text-sm"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) => updateReceivedItem(index, 'expiryDate', e.target.value)}
                            className="input text-center text-sm"
                            required={item.quantity > 0}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <div className="bg-success-50 border border-success-200 rounded-xl px-6 py-4">
                  <p className="text-sm text-success-700">Total items to receive:</p>
                  <p className="text-2xl font-bold text-success">{totalReceiving}</p>
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
          <Button type="submit" loading={saving} icon={CheckCircle} disabled={totalReceiving === 0}>
            Receive {totalReceiving} Items
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PurchaseOrderReceive;
