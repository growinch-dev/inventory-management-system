import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Package,
  Building2,
  Calendar,
  User,
  Send,
  RotateCcw,
  CalendarPlus,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { demoIssuesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge } from '../components/ui';
import { format, formatDistanceToNow } from 'date-fns';

const statusColors = {
  draft: 'gray',
  issued: 'info',
  partial_return: 'warning',
  returned: 'success',
  overdue: 'danger',
  cancelled: 'gray',
};

const DemoIssueDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [demoIssue, setDemoIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [returnData, setReturnData] = useState({ items: [] });
  const [extendData, setExtendData] = useState({ newReturnDate: '', reason: '' });

  useEffect(() => {
    fetchDemoIssue();
  }, [id]);

  const fetchDemoIssue = async () => {
    try {
      setLoading(true);
      const response = await demoIssuesAPI.getOne(id);
      if (response.data.success) {
        setDemoIssue(response.data.data);
        // Initialize return data
        setReturnData({
          items: response.data.data.items?.map(item => ({
            itemId: item._id,
            returnedQuantity: 0,
            condition: 'good',
            conditionNotes: '',
          })) || [],
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

  const handleIssue = async () => {
    if (!window.confirm('Issue these demo items? Stock will be deducted.')) return;

    try {
      await demoIssuesAPI.issue(id, {});
      toast.success('Demo items issued successfully');
      fetchDemoIssue();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to issue demo items');
    }
  };

  const handleReturn = async () => {
    const itemsWithReturn = returnData.items.filter(i => i.returnedQuantity > 0);
    if (itemsWithReturn.length === 0) {
      toast.error('Please enter return quantities');
      return;
    }

    try {
      await demoIssuesAPI.returnItems(id, {
        items: itemsWithReturn,
        returnInfo: {
          overallCondition: 'good',
        },
      });
      toast.success('Items returned successfully');
      setShowReturnModal(false);
      fetchDemoIssue();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to return items');
    }
  };

  const handleExtend = async () => {
    if (!extendData.newReturnDate) {
      toast.error('Please select a new return date');
      return;
    }

    try {
      await demoIssuesAPI.extend(id, extendData);
      toast.success('Return date extended successfully');
      setShowExtendModal(false);
      fetchDemoIssue();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to extend return date');
    }
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

  if (!demoIssue) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-500">Demo issue not found</p>
      </div>
    );
  }

  const isOverdue = demoIssue.status !== 'returned' && demoIssue.status !== 'cancelled' &&
    new Date(demoIssue.expectedReturnDate) < new Date();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={demoIssue.issueNumber}
        subtitle={`Demo to ${demoIssue.hospital?.name}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/demo-issues')} icon={ArrowLeft}>
              Back
            </Button>
            {demoIssue.status === 'draft' && (
              <Button onClick={handleIssue} icon={Send}>
                Issue Items
              </Button>
            )}
            {['issued', 'partial_return', 'overdue'].includes(demoIssue.status) && (
              <>
                <Button variant="secondary" onClick={() => setShowExtendModal(true)} icon={CalendarPlus}>
                  Extend
                </Button>
                <Button onClick={() => setShowReturnModal(true)} icon={RotateCcw}>
                  Return Items
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => navigate(`/demo-issues/${id}/edit`)} icon={Edit2}>
              Edit
            </Button>
          </div>
        }
      />

      {/* Status and Alert */}
      <div className="flex gap-3 flex-wrap">
        <Badge color={statusColors[demoIssue.status] || 'gray'} size="lg">
          {demoIssue.status?.replace(/_/g, ' ').toUpperCase()}
        </Badge>
        <Badge color="gray" className="capitalize">
          {demoIssue.purpose}
        </Badge>
        {isOverdue && (
          <Badge color="danger" className="flex items-center gap-1">
            <AlertTriangle size={12} />
            Overdue by {formatDistanceToNow(new Date(demoIssue.expectedReturnDate))}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hospital Info */}
          <Card>
            <Card.Content className="p-6">
              <Card.Title icon={Building2}>Hospital Details</Card.Title>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="col-span-2">
                  <p className="text-lg font-semibold text-secondary">{demoIssue.hospital?.name}</p>
                  {demoIssue.hospital?.department && (
                    <p className="text-secondary-500">{demoIssue.hospital.department}</p>
                  )}
                </div>
                {demoIssue.hospital?.address && (
                  <div className="col-span-2 flex items-start gap-2 text-secondary-600">
                    <MapPin size={16} className="mt-0.5 text-secondary-400" />
                    <span>
                      {demoIssue.hospital.address}
                      {demoIssue.hospital.city && `, ${demoIssue.hospital.city}`}
                      {demoIssue.hospital.state && `, ${demoIssue.hospital.state}`}
                      {demoIssue.hospital.pincode && ` - ${demoIssue.hospital.pincode}`}
                    </span>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>

          {/* Contact Person */}
          {demoIssue.contactPerson?.name && (
            <Card>
              <Card.Content className="p-6">
                <Card.Title icon={User}>Contact Person</Card.Title>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="font-medium">{demoIssue.contactPerson.name}</p>
                    {demoIssue.contactPerson.designation && (
                      <p className="text-sm text-secondary-500">{demoIssue.contactPerson.designation}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {demoIssue.contactPerson.phone && (
                      <div className="flex items-center gap-2 text-secondary-600">
                        <Phone size={14} />
                        {demoIssue.contactPerson.phone}
                      </div>
                    )}
                    {demoIssue.contactPerson.email && (
                      <div className="flex items-center gap-2 text-secondary-600">
                        <Mail size={14} />
                        {demoIssue.contactPerson.email}
                      </div>
                    )}
                  </div>
                </div>
              </Card.Content>
            </Card>
          )}

          {/* Items */}
          <Card>
            <Card.Content className="p-6">
              <Card.Title icon={Package}>Demo Items</Card.Title>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-secondary-600">Product</th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-secondary-600">Issued</th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-secondary-600">Returned</th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-secondary-600">Pending</th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-secondary-600">Condition</th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-secondary-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoIssue.items?.map((item, index) => (
                      <tr key={index} className="border-b border-secondary-100">
                        <td className="px-4 py-3">
                          <p className="font-medium">{item.product?.name || 'Unknown Product'}</p>
                          <p className="text-xs text-secondary-500">{item.product?.sku}</p>
                          {item.serialNumbers?.length > 0 && (
                            <p className="text-xs text-secondary-400 mt-1">
                              S/N: {item.serialNumbers.join(', ')}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{item.quantity}</td>
                        <td className="px-4 py-3 text-center font-medium text-green-600">{item.returnedQuantity || 0}</td>
                        <td className="px-4 py-3 text-center font-medium text-orange-600">
                          {(item.quantity || 0) - (item.returnedQuantity || 0)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            color={item.condition === 'good' ? 'success' :
                                   item.condition === 'damaged' ? 'danger' : 'warning'}
                            size="sm"
                          >
                            {item.condition || '-'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            color={item.status === 'returned' ? 'success' :
                                   item.status === 'partial_return' ? 'warning' : 'info'}
                            size="sm"
                          >
                            {item.status?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <Card>
            <Card.Content className="p-6">
              <Card.Title icon={Calendar}>Timeline</Card.Title>
              <div className="space-y-4 mt-4">
                <div className="flex justify-between">
                  <span className="text-secondary-500">Issue Date</span>
                  <span className="font-medium">{formatDate(demoIssue.issueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Expected Return</span>
                  <span className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                    {formatDate(demoIssue.expectedReturnDate)}
                  </span>
                </div>
                {demoIssue.actualReturnDate && (
                  <div className="flex justify-between">
                    <span className="text-secondary-500">Actual Return</span>
                    <span className="font-medium text-green-600">{formatDate(demoIssue.actualReturnDate)}</span>
                  </div>
                )}
                {demoIssue.daysUntilReturn && demoIssue.status !== 'returned' && (
                  <div className="pt-2 border-t">
                    <p className={`text-sm font-medium ${demoIssue.daysUntilReturn < 0 ? 'text-red-600' : demoIssue.daysUntilReturn <= 3 ? 'text-orange-500' : 'text-green-600'}`}>
                      {demoIssue.daysUntilReturn < 0
                        ? `Overdue by ${Math.abs(demoIssue.daysUntilReturn)} days`
                        : `${demoIssue.daysUntilReturn} days until return`}
                    </p>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>

          {/* Security Deposit */}
          {demoIssue.securityDeposit?.amount > 0 && (
            <Card>
              <Card.Content className="p-6">
                <Card.Title>Security Deposit</Card.Title>
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between">
                    <span className="text-secondary-500">Amount</span>
                    <span className="font-bold">₹{demoIssue.securityDeposit.amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-500">Status</span>
                    <Badge color={demoIssue.securityDeposit.received ? 'success' : 'warning'}>
                      {demoIssue.securityDeposit.received ? 'Received' : 'Pending'}
                    </Badge>
                  </div>
                  {demoIssue.securityDeposit.refunded && (
                    <Badge color="success" className="w-full justify-center">
                      <CheckCircle2 size={12} className="mr-1" />
                      Refunded
                    </Badge>
                  )}
                </div>
              </Card.Content>
            </Card>
          )}

          {/* Conversion Status */}
          <Card>
            <Card.Content className="p-6">
              <Card.Title>Conversion Status</Card.Title>
              <div className="mt-4">
                <Badge
                  color={demoIssue.conversionStatus === 'converted' ? 'success' :
                         demoIssue.conversionStatus === 'interested' || demoIssue.conversionStatus === 'negotiating' ? 'warning' :
                         demoIssue.conversionStatus === 'lost' || demoIssue.conversionStatus === 'not_interested' ? 'danger' : 'gray'}
                  size="lg"
                  className="w-full justify-center capitalize"
                >
                  {demoIssue.conversionStatus?.replace(/_/g, ' ')}
                </Badge>
              </div>
            </Card.Content>
          </Card>

          {/* Notes */}
          {demoIssue.internalNotes && (
            <Card>
              <Card.Content className="p-6">
                <Card.Title>Internal Notes</Card.Title>
                <p className="mt-4 text-secondary-600 text-sm whitespace-pre-wrap">
                  {demoIssue.internalNotes}
                </p>
              </Card.Content>
            </Card>
          )}
        </div>
      </div>

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-secondary-100">
              <h3 className="font-semibold text-lg">Return Demo Items</h3>
            </div>
            <div className="p-6 space-y-4">
              {demoIssue.items?.filter(i => (i.quantity - (i.returnedQuantity || 0)) > 0).map((item, index) => {
                const pending = item.quantity - (item.returnedQuantity || 0);
                return (
                  <div key={item._id} className="p-4 border border-secondary-200 rounded-lg">
                    <div className="flex justify-between mb-3">
                      <div>
                        <p className="font-medium">{item.product?.name}</p>
                        <p className="text-sm text-secondary-500">Pending: {pending}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="label">Return Qty</label>
                        <input
                          type="number"
                          min="0"
                          max={pending}
                          value={returnData.items.find(i => i.itemId === item._id)?.returnedQuantity || 0}
                          onChange={(e) => {
                            setReturnData(prev => ({
                              ...prev,
                              items: prev.items.map(i =>
                                i.itemId === item._id
                                  ? { ...i, returnedQuantity: Math.min(parseInt(e.target.value) || 0, pending) }
                                  : i
                              ),
                            }));
                          }}
                          className="input w-full"
                        />
                      </div>
                      <div>
                        <label className="label">Condition</label>
                        <select
                          value={returnData.items.find(i => i.itemId === item._id)?.condition || 'good'}
                          onChange={(e) => {
                            setReturnData(prev => ({
                              ...prev,
                              items: prev.items.map(i =>
                                i.itemId === item._id ? { ...i, condition: e.target.value } : i
                              ),
                            }));
                          }}
                          className="select w-full"
                        >
                          <option value="good">Good</option>
                          <option value="acceptable">Acceptable</option>
                          <option value="damaged">Damaged</option>
                          <option value="partial_damage">Partial Damage</option>
                          <option value="lost">Lost</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Notes</label>
                        <input
                          type="text"
                          value={returnData.items.find(i => i.itemId === item._id)?.conditionNotes || ''}
                          onChange={(e) => {
                            setReturnData(prev => ({
                              ...prev,
                              items: prev.items.map(i =>
                                i.itemId === item._id ? { ...i, conditionNotes: e.target.value } : i
                              ),
                            }));
                          }}
                          className="input w-full"
                          placeholder="Any notes..."
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-secondary-100 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowReturnModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleReturn} icon={RotateCcw}>
                Confirm Return
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-secondary-100">
              <h3 className="font-semibold text-lg">Extend Return Date</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Current Return Date</label>
                <p className="text-secondary-600">{formatDate(demoIssue.expectedReturnDate)}</p>
              </div>
              <div>
                <label className="label">New Return Date *</label>
                <input
                  type="date"
                  value={extendData.newReturnDate}
                  onChange={(e) => setExtendData(prev => ({ ...prev, newReturnDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="label">Reason</label>
                <textarea
                  value={extendData.reason}
                  onChange={(e) => setExtendData(prev => ({ ...prev, reason: e.target.value }))}
                  className="input w-full"
                  rows={3}
                  placeholder="Reason for extension..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-secondary-100 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowExtendModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleExtend} icon={CalendarPlus}>
                Extend
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoIssueDetail;
