import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  FileText,
  Building2,
  Calendar,
  IndianRupee,
  Banknote,
  Shield,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { tendersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge } from '../components/ui';
import { format } from 'date-fns';

const statusColors = {
  draft: 'gray',
  submitted: 'info',
  technical_evaluation: 'warning',
  financial_evaluation: 'warning',
  awarded: 'success',
  loa_received: 'success',
  po_received: 'success',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'danger',
  lost: 'danger',
};

const TenderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSupplyModal, setShowSupplyModal] = useState(false);

  useEffect(() => {
    fetchTender();
  }, [id]);

  const fetchTender = async () => {
    try {
      setLoading(true);
      const response = await tendersAPI.getOne(id);
      if (response.data.success) {
        setTender(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching tender:', error);
      toast.error('Failed to load tender');
      navigate('/tenders');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return format(new Date(date), 'dd MMM yyyy');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-500">Tender not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={tender.tenderNumber}
        subtitle={tender.title}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/tenders')} icon={ArrowLeft}>
              Back
            </Button>
            <Button onClick={() => navigate(`/tenders/${id}/edit`)} icon={Edit2}>
              Edit
            </Button>
          </div>
        }
      />

      {/* Status and Priority */}
      <div className="flex gap-3">
        <Badge color={statusColors[tender.status] || 'gray'} size="lg">
          {tender.status?.replace(/_/g, ' ').toUpperCase()}
        </Badge>
        <Badge color={tender.priority === 'critical' ? 'danger' : tender.priority === 'high' ? 'warning' : 'gray'}>
          {tender.priority?.toUpperCase()} Priority
        </Badge>
        {tender.supplyProgress > 0 && (
          <Badge color="info">
            <TrendingUp size={12} className="mr-1" />
            {tender.supplyProgress}% Supplied
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organization */}
          <Card>
            <Card.Content className="p-6">
              <Card.Title icon={Building2}>Organization</Card.Title>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-secondary-500">Name</p>
                  <p className="font-medium">{tender.organization?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">Type</p>
                  <p className="font-medium capitalize">{tender.organization?.type?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">Contact Person</p>
                  <p className="font-medium">{tender.organization?.contactPerson || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-500">Phone</p>
                  <p className="font-medium">{tender.organization?.contactPhone || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-secondary-500">Address</p>
                  <p className="font-medium">{tender.organization?.address || '-'}</p>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Items */}
          <Card>
            <Card.Content className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Card.Title icon={Package}>Tender Items</Card.Title>
                {tender.items?.length > 0 && (
                  <span className="text-sm text-secondary-500">
                    {tender.items.length} item(s)
                  </span>
                )}
              </div>

              {tender.items?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-secondary-600">Product</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-secondary-600">Qty</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-secondary-600">Unit Price</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-secondary-600">Total</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-secondary-600">Delivered</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-secondary-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tender.items.map((item, index) => (
                        <tr key={index} className="border-b border-secondary-100">
                          <td className="px-4 py-3">
                            <p className="font-medium">{item.product?.name || item.description}</p>
                            <p className="text-xs text-secondary-500">{item.product?.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={item.deliveredQuantity >= item.quantity ? 'text-green-600' : ''}>
                              {item.deliveredQuantity || 0} / {item.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              color={item.status === 'completed' ? 'success' : item.status === 'partial' ? 'warning' : 'gray'}
                              size="sm"
                            >
                              {item.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-secondary-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right font-medium">Total</td>
                        <td className="px-4 py-2 text-right font-bold">
                          {formatCurrency(tender.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0))}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-center text-secondary-400 py-4">No items added</p>
              )}
            </Card.Content>
          </Card>

          {/* Supply Orders */}
          <Card>
            <Card.Content className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Card.Title icon={Truck}>Supply Orders</Card.Title>
                <Button variant="ghost" size="sm" onClick={() => setShowSupplyModal(true)} icon={Plus}>
                  Add Supply
                </Button>
              </div>

              {tender.supplyOrders?.length > 0 ? (
                <div className="space-y-3">
                  {tender.supplyOrders.map((supply, index) => (
                    <div key={index} className="p-4 border border-secondary-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{supply.invoiceNumber || supply.challanNumber || `Supply #${index + 1}`}</p>
                          <p className="text-sm text-secondary-500">
                            {supply.deliveryDate ? formatDate(supply.deliveryDate) : 'Not delivered yet'}
                          </p>
                        </div>
                        <Badge
                          color={supply.status === 'delivered' || supply.status === 'acknowledged' ? 'success' :
                                 supply.status === 'dispatched' ? 'info' : 'warning'}
                        >
                          {supply.status}
                        </Badge>
                      </div>
                      {supply.remarks && (
                        <p className="text-sm text-secondary-600 mt-2">{supply.remarks}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-secondary-400 py-4">No supply orders yet</p>
              )}
            </Card.Content>
          </Card>

          {/* Payments */}
          <Card>
            <Card.Content className="p-6">
              <Card.Title icon={IndianRupee}>Payment History</Card.Title>

              {tender.payments?.length > 0 ? (
                <div className="space-y-3 mt-4">
                  {tender.payments.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
                      <div>
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-secondary-500">
                          {payment.paymentMethod} • {formatDate(payment.receivedDate)}
                        </p>
                      </div>
                      <p className="text-sm text-secondary-600">{payment.referenceNumber}</p>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-secondary-200">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Received</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(tender.payments.reduce((sum, p) => sum + (p.amount || 0), 0))}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-secondary-400 py-4">No payments recorded</p>
              )}
            </Card.Content>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <Card>
            <Card.Content className="p-6">
              <Card.Title icon={Calendar}>Important Dates</Card.Title>
              <div className="space-y-4 mt-4">
                <div className="flex justify-between">
                  <span className="text-secondary-500">Publish Date</span>
                  <span className="font-medium">{formatDate(tender.publishDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Submission Deadline</span>
                  <span className="font-medium">{formatDate(tender.submissionDeadline)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Opening Date</span>
                  <span className="font-medium">{formatDate(tender.openingDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Validity Period</span>
                  <span className="font-medium">{tender.validityPeriod} days</span>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Financial Summary */}
          <Card>
            <Card.Content className="p-6">
              <Card.Title icon={IndianRupee}>Financial Summary</Card.Title>
              <div className="space-y-4 mt-4">
                <div className="flex justify-between">
                  <span className="text-secondary-500">Estimated Value</span>
                  <span className="font-medium">{formatCurrency(tender.estimatedValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Quoted Value</span>
                  <span className="font-medium">{formatCurrency(tender.quotedValue)}</span>
                </div>
                {tender.finalValue && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-secondary-500">Final Value</span>
                    <span className="font-bold text-green-600">{formatCurrency(tender.finalValue)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-secondary-500">Delivered Value</span>
                  <span className="font-medium">{formatCurrency(tender.deliveredValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Pending Value</span>
                  <span className="font-medium text-orange-600">{formatCurrency(tender.pendingSupplyValue)}</span>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* EMD */}
          <Card>
            <Card.Content className="p-6">
              <Card.Title icon={Banknote}>EMD Details</Card.Title>
              {tender.emd?.required ? (
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between">
                    <span className="text-secondary-500">Amount</span>
                    <span className="font-bold">{formatCurrency(tender.emd.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-500">Type</span>
                    <span className="font-medium capitalize">{tender.emd.type?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-500">Status</span>
                    <Badge
                      color={tender.emd.status === 'refunded' ? 'success' :
                             tender.emd.status === 'forfeited' ? 'danger' :
                             tender.emd.status === 'submitted' ? 'info' : 'warning'}
                    >
                      {tender.emd.status}
                    </Badge>
                  </div>
                  {tender.emd.validUntil && (
                    <div className="flex justify-between">
                      <span className="text-secondary-500">Valid Until</span>
                      <span className="font-medium">{formatDate(tender.emd.validUntil)}</span>
                    </div>
                  )}
                  {tender.emd.instrumentNumber && (
                    <div className="flex justify-between">
                      <span className="text-secondary-500">Instrument #</span>
                      <span className="font-medium">{tender.emd.instrumentNumber}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-secondary-400 mt-4">EMD not required</p>
              )}
            </Card.Content>
          </Card>

          {/* Security Deposit */}
          <Card>
            <Card.Content className="p-6">
              <Card.Title icon={Shield}>Security Deposit</Card.Title>
              {tender.securityDeposit?.required ? (
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between">
                    <span className="text-secondary-500">Amount</span>
                    <span className="font-bold">{formatCurrency(tender.securityDeposit.amount)}</span>
                  </div>
                  {tender.securityDeposit.percentage && (
                    <div className="flex justify-between">
                      <span className="text-secondary-500">Percentage</span>
                      <span className="font-medium">{tender.securityDeposit.percentage}%</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-secondary-500">Type</span>
                    <span className="font-medium capitalize">{tender.securityDeposit.type?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-500">Status</span>
                    <Badge
                      color={tender.securityDeposit.status === 'refunded' ? 'success' :
                             tender.securityDeposit.status === 'forfeited' ? 'danger' :
                             tender.securityDeposit.status === 'submitted' ? 'info' : 'warning'}
                    >
                      {tender.securityDeposit.status}
                    </Badge>
                  </div>
                  {tender.securityDeposit.validUntil && (
                    <div className="flex justify-between">
                      <span className="text-secondary-500">Valid Until</span>
                      <span className="font-medium">{formatDate(tender.securityDeposit.validUntil)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-secondary-400 mt-4">Security Deposit not required</p>
              )}
            </Card.Content>
          </Card>

          {/* Notes */}
          {tender.notes && (
            <Card>
              <Card.Content className="p-6">
                <Card.Title icon={FileText}>Notes</Card.Title>
                <p className="mt-4 text-secondary-600">{tender.notes}</p>
              </Card.Content>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenderDetail;
