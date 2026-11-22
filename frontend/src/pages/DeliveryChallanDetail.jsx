import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Truck,
  CheckCircle,
  RotateCcw,
  FileText,
  Printer,
  Package,
  Building,
  MapPin,
  Phone,
  Calendar,
  AlertTriangle,
  X,
  Clock,
} from 'lucide-react';
import { deliveryChallansAPI } from '../services/api';
import { Button, Card, Badge, LoadingSpinner, Input, Select, Textarea } from '../components/ui';
import toast from 'react-hot-toast';

const challanTypeLabels = {
  demo: 'Demo',
  approval: 'Approval Basis',
  job_work: 'Job Work',
  returnable: 'Returnable',
  non_returnable: 'Non-Returnable',
  sample: 'Sample',
  credit: 'Credit',
};

const statusColors = {
  draft: 'secondary',
  dispatched: 'primary',
  in_transit: 'warning',
  delivered: 'success',
  partial_return: 'warning',
  returned: 'info',
  converted: 'success',
  cancelled: 'danger',
};

const DeliveryChallanDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const [dispatchData, setDispatchData] = useState({
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    transporterName: '',
    eWayBillNumber: '',
  });

  const [deliverData, setDeliverData] = useState({
    receivedBy: '',
    acknowledgmentNotes: '',
  });

  const [returnItems, setReturnItems] = useState([]);

  useEffect(() => {
    fetchChallan();
  }, [id]);

  const fetchChallan = async () => {
    try {
      setLoading(true);
      const { data } = await deliveryChallansAPI.getOne(id);
      setChallan(data.data);

      // Initialize return items
      setReturnItems(
        data.data.items.map((item) => {
          const returned = (data.data.returnedItems || [])
            .filter((r) => r.product?._id === item.product?._id || r.product === item.product?._id)
            .reduce((sum, r) => sum + r.quantityReturned, 0);
          return {
            product: item.product?._id || item.product,
            productName: item.productName,
            issued: item.quantity,
            alreadyReturned: returned,
            quantityReturned: 0,
            condition: 'good',
            notes: '',
          };
        })
      );
    } catch (error) {
      toast.error('Failed to fetch delivery challan');
      navigate('/delivery-challans');
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async () => {
    try {
      setActionLoading(true);
      await deliveryChallansAPI.dispatch(id, { transportDetails: dispatchData });
      toast.success('Delivery Challan dispatched successfully');
      setShowDispatchModal(false);
      fetchChallan();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to dispatch challan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async () => {
    try {
      setActionLoading(true);
      await deliveryChallansAPI.deliver(id, deliverData);
      toast.success('Delivery Challan marked as delivered');
      setShowDeliverModal(false);
      fetchChallan();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark as delivered');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    const itemsToReturn = returnItems
      .filter((item) => item.quantityReturned > 0)
      .map((item) => ({
        product: item.product,
        quantityReturned: parseInt(item.quantityReturned),
        condition: item.condition,
        notes: item.notes,
      }));

    if (itemsToReturn.length === 0) {
      toast.error('Please enter return quantities');
      return;
    }

    try {
      setActionLoading(true);
      await deliveryChallansAPI.returnItems(id, { returnedItems: itemsToReturn });
      toast.success('Items returned successfully');
      setShowReturnModal(false);
      fetchChallan();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process return');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToInvoice = async () => {
    try {
      setActionLoading(true);
      const { data } = await deliveryChallansAPI.convertToInvoice(id, {});
      toast.success('Challan converted to invoice successfully');
      setShowConvertModal(false);
      navigate(`/invoices/${data.data.invoice._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to convert to invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnItemChange = (index, field, value) => {
    setReturnItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
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

  const isReturnable = ['demo', 'approval', 'job_work', 'returnable'].includes(
    challan?.challanType
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!challan) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-500">Delivery Challan not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/delivery-challans')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-secondary">
                {challan.challanNumber}
              </h1>
              <Badge variant={statusColors[challan.status]} size="lg">
                {challan.status?.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-secondary-500 mt-1">
              {challanTypeLabels[challan.challanType]} Challan
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {challan.status === 'draft' && (
            <>
              <Button
                variant="outline"
                onClick={() => navigate(`/delivery-challans/${id}/edit`)}
              >
                <Edit size={18} className="mr-2" />
                Edit
              </Button>
              <Button onClick={() => setShowDispatchModal(true)}>
                <Truck size={18} className="mr-2" />
                Dispatch
              </Button>
            </>
          )}

          {['dispatched', 'in_transit'].includes(challan.status) && (
            <Button onClick={() => setShowDeliverModal(true)}>
              <CheckCircle size={18} className="mr-2" />
              Mark Delivered
            </Button>
          )}

          {isReturnable &&
            ['dispatched', 'delivered', 'partial_return'].includes(challan.status) && (
              <Button variant="outline" onClick={() => setShowReturnModal(true)}>
                <RotateCcw size={18} className="mr-2" />
                Process Return
              </Button>
            )}

          {['delivered', 'partial_return'].includes(challan.status) &&
            !challan.convertedToInvoice && (
              <Button variant="primary" onClick={() => setShowConvertModal(true)}>
                <FileText size={18} className="mr-2" />
                Convert to Invoice
              </Button>
            )}

          <Button variant="outline">
            <Printer size={18} className="mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Overdue Warning */}
      {challan.isOverdue && challan.returnStatus !== 'complete' && (
        <Card className="p-4 bg-danger-light border-danger/20">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-danger" />
            <p className="text-danger font-medium">
              Return is overdue! Expected return date was {formatDate(challan.expectedReturnDate)}
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Consignee Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
              <Building size={20} className="text-primary" />
              Consignee Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-secondary-500">Name</p>
                <p className="font-medium text-secondary">{challan.consignee?.name}</p>
              </div>
              <div>
                <p className="text-sm text-secondary-500">Phone</p>
                <p className="font-medium text-secondary">
                  {challan.consignee?.phone || '-'}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-secondary-500">Address</p>
                <p className="font-medium text-secondary">
                  {[
                    challan.consignee?.address,
                    challan.consignee?.city,
                    challan.consignee?.state,
                    challan.consignee?.pincode,
                  ]
                    .filter(Boolean)
                    .join(', ') || '-'}
                </p>
              </div>
              {challan.consignee?.gstNumber && (
                <div>
                  <p className="text-sm text-secondary-500">GST Number</p>
                  <p className="font-medium text-secondary">{challan.consignee.gstNumber}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Items */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
              <Package size={20} className="text-primary" />
              Items
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                      Product
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-secondary-700">
                      Qty
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-secondary-700">
                      Unit
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-secondary-700">
                      Rate
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-secondary-700">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {challan.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-secondary">{item.productName}</p>
                        <p className="text-sm text-secondary-500">SKU: {item.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-secondary">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-center text-secondary">
                        {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-secondary">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-secondary">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-secondary-50">
                  <tr>
                    <td colSpan="3"></td>
                    <td className="px-4 py-3 text-right font-semibold text-secondary">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary text-lg">
                      {formatCurrency(challan.totalValue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Return History */}
          {challan.returnedItems && challan.returnedItems.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
                <RotateCcw size={20} className="text-primary" />
                Return History
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                        Product
                      </th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-secondary-700">
                        Qty Returned
                      </th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-secondary-700">
                        Condition
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                        Date
                      </th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-secondary-700">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {challan.returnedItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-secondary">
                            {item.product?.name || 'Product'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center text-secondary">
                          {item.quantityReturned}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={
                              item.condition === 'good'
                                ? 'success'
                                : item.condition === 'damaged'
                                ? 'warning'
                                : 'danger'
                            }
                            size="sm"
                          >
                            {item.condition}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-secondary-600">
                          {formatDate(item.returnDate)}
                        </td>
                        <td className="px-4 py-3 text-secondary-600">
                          {item.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Challan Info */}
          <Card className="p-6">
            <h3 className="font-semibold text-secondary mb-4">Challan Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-secondary-500">Type</span>
                <Badge variant="secondary">
                  {challanTypeLabels[challan.challanType]}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-500">Date</span>
                <span className="text-secondary">{formatDate(challan.challanDate)}</span>
              </div>
              {challan.dispatchDate && (
                <div className="flex justify-between">
                  <span className="text-secondary-500">Dispatched</span>
                  <span className="text-secondary">{formatDate(challan.dispatchDate)}</span>
                </div>
              )}
              {challan.actualDeliveryDate && (
                <div className="flex justify-between">
                  <span className="text-secondary-500">Delivered</span>
                  <span className="text-secondary">
                    {formatDate(challan.actualDeliveryDate)}
                  </span>
                </div>
              )}
              {isReturnable && (
                <>
                  <div className="flex justify-between">
                    <span className="text-secondary-500">Return Due</span>
                    <span
                      className={
                        challan.isOverdue ? 'text-danger font-medium' : 'text-secondary'
                      }
                    >
                      {formatDate(challan.expectedReturnDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-500">Return Status</span>
                    <Badge
                      variant={
                        challan.returnStatus === 'complete'
                          ? 'success'
                          : challan.returnStatus === 'partial'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {challan.returnStatus}
                    </Badge>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-secondary-500">Total Items</span>
                <span className="text-secondary">{challan.totalQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-500">Total Value</span>
                <span className="font-medium text-primary">
                  {formatCurrency(challan.totalValue)}
                </span>
              </div>
            </div>
          </Card>

          {/* Transport Info */}
          {challan.transportDetails && (
            <Card className="p-6">
              <h3 className="font-semibold text-secondary mb-4 flex items-center gap-2">
                <Truck size={18} className="text-primary" />
                Transport Details
              </h3>
              <div className="space-y-3 text-sm">
                {challan.transportDetails.vehicleNumber && (
                  <div>
                    <span className="text-secondary-500">Vehicle No:</span>
                    <span className="ml-2 text-secondary">
                      {challan.transportDetails.vehicleNumber}
                    </span>
                  </div>
                )}
                {challan.transportDetails.transporterName && (
                  <div>
                    <span className="text-secondary-500">Transporter:</span>
                    <span className="ml-2 text-secondary">
                      {challan.transportDetails.transporterName}
                    </span>
                  </div>
                )}
                {challan.transportDetails.driverName && (
                  <div>
                    <span className="text-secondary-500">Driver:</span>
                    <span className="ml-2 text-secondary">
                      {challan.transportDetails.driverName}
                    </span>
                  </div>
                )}
                {challan.transportDetails.eWayBillNumber && (
                  <div>
                    <span className="text-secondary-500">E-Way Bill:</span>
                    <span className="ml-2 text-secondary">
                      {challan.transportDetails.eWayBillNumber}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Terms & Notes */}
          {(challan.purpose || challan.remarks) && (
            <Card className="p-6">
              <h3 className="font-semibold text-secondary mb-4">Notes</h3>
              {challan.purpose && (
                <div className="mb-3">
                  <p className="text-sm text-secondary-500">Purpose</p>
                  <p className="text-secondary">{challan.purpose}</p>
                </div>
              )}
              {challan.remarks && (
                <div>
                  <p className="text-sm text-secondary-500">Remarks</p>
                  <p className="text-secondary">{challan.remarks}</p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary">Dispatch Challan</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDispatchModal(false)}
              >
                <X size={20} />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Vehicle Number
                </label>
                <Input
                  value={dispatchData.vehicleNumber}
                  onChange={(e) =>
                    setDispatchData((prev) => ({
                      ...prev,
                      vehicleNumber: e.target.value,
                    }))
                  }
                  placeholder="e.g., DL 01 AB 1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Driver Name
                </label>
                <Input
                  value={dispatchData.driverName}
                  onChange={(e) =>
                    setDispatchData((prev) => ({ ...prev, driverName: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  E-Way Bill Number
                </label>
                <Input
                  value={dispatchData.eWayBillNumber}
                  onChange={(e) =>
                    setDispatchData((prev) => ({
                      ...prev,
                      eWayBillNumber: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowDispatchModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleDispatch} disabled={actionLoading}>
                {actionLoading ? <LoadingSpinner size="sm" /> : 'Dispatch'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Deliver Modal */}
      {showDeliverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary">Mark as Delivered</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeliverModal(false)}
              >
                <X size={20} />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Received By
                </label>
                <Input
                  value={deliverData.receivedBy}
                  onChange={(e) =>
                    setDeliverData((prev) => ({ ...prev, receivedBy: e.target.value }))
                  }
                  placeholder="Name of receiver"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Acknowledgment Notes
                </label>
                <Textarea
                  value={deliverData.acknowledgmentNotes}
                  onChange={(e) =>
                    setDeliverData((prev) => ({
                      ...prev,
                      acknowledgmentNotes: e.target.value,
                    }))
                  }
                  placeholder="Any notes about the delivery..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowDeliverModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleDeliver} disabled={actionLoading}>
                {actionLoading ? <LoadingSpinner size="sm" /> : 'Confirm Delivery'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary">Process Return</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReturnModal(false)}
              >
                <X size={20} />
              </Button>
            </div>

            <table className="w-full">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="text-left px-3 py-2 text-sm font-semibold text-secondary-700">
                    Product
                  </th>
                  <th className="text-center px-3 py-2 text-sm font-semibold text-secondary-700 w-20">
                    Issued
                  </th>
                  <th className="text-center px-3 py-2 text-sm font-semibold text-secondary-700 w-20">
                    Returned
                  </th>
                  <th className="text-center px-3 py-2 text-sm font-semibold text-secondary-700 w-24">
                    Return Qty
                  </th>
                  <th className="text-center px-3 py-2 text-sm font-semibold text-secondary-700 w-28">
                    Condition
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {returnItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-secondary text-sm">
                        {item.productName}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-center text-secondary">
                      {item.issued}
                    </td>
                    <td className="px-3 py-2 text-center text-secondary">
                      {item.alreadyReturned}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        max={item.issued - item.alreadyReturned}
                        value={item.quantityReturned}
                        onChange={(e) =>
                          handleReturnItemChange(index, 'quantityReturned', e.target.value)
                        }
                        className="text-center"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={item.condition}
                        onChange={(e) =>
                          handleReturnItemChange(index, 'condition', e.target.value)
                        }
                        className="text-sm"
                      >
                        <option value="good">Good</option>
                        <option value="damaged">Damaged</option>
                        <option value="lost">Lost</option>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowReturnModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleReturn} disabled={actionLoading}>
                {actionLoading ? <LoadingSpinner size="sm" /> : 'Process Return'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Convert to Invoice Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary">Convert to Invoice</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConvertModal(false)}
              >
                <X size={20} />
              </Button>
            </div>
            <p className="text-secondary-600 mb-4">
              This will create a new invoice from this delivery challan. The items and
              consignee details will be copied to the invoice.
            </p>
            <p className="text-sm text-secondary-500 mb-6">
              Total Value: <span className="font-medium text-primary">{formatCurrency(challan.totalValue)}</span>
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowConvertModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleConvertToInvoice} disabled={actionLoading}>
                {actionLoading ? <LoadingSpinner size="sm" /> : 'Create Invoice'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DeliveryChallanDetail;
