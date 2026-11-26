import { useState, useEffect } from 'react';
import { Plus, Wallet, Trash2, X, Users } from 'lucide-react';
import { salariesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { PageHeader, Button, Card, LoadingSpinner, EmptyState } from '../components/ui';

const MODES = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
];
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const today = () => new Date().toISOString().split('T')[0];
const thisMonth = () => new Date().toISOString().slice(0, 7);
const emptyForm = { date: today(), employeeName: '', designation: '', month: thisMonth(), amount: '', mode: 'bank_transfer', reference: '', notes: '' };

const Salaries = () => {
  const [items, setItems] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await salariesAPI.getAll();
      setItems(res.data.data || []);
      setTotalAmount(res.data.totalAmount || 0);
    } catch (error) {
      toast.error('Failed to load salary payments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeName || !form.amount || !form.month) return toast.error('Employee, month and amount are required');
    try {
      setSaving(true);
      await salariesAPI.create({ ...form, amount: Number(form.amount) });
      toast.success('Salary payment recorded');
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this salary payment?')) return;
    try {
      await salariesAPI.delete(id);
      toast.success('Deleted');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Salary Payments" description="Record salary paid to employees">
        <Button onClick={() => { setForm(emptyForm); setShowModal(true); }} icon={Plus}>Add Payment</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500">Total Paid</p>
              <p className="text-2xl font-bold text-secondary">{money(totalAmount)}</p>
            </div>
            <Wallet className="w-8 h-8 text-primary" />
          </div>
        </Card>
        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500">Payments</p>
              <p className="text-2xl font-bold text-secondary">{items.length}</p>
            </div>
            <Users className="w-8 h-8 text-info" />
          </div>
        </Card>
      </div>

      {loading ? (
        <LoadingSpinner.Container className="h-64" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={Wallet} title="No salary payments yet" description="Record your first employee salary payment" actionText="Add Payment" actionOnClick={() => setShowModal(true)} actionIcon={Plus} />
        </Card>
      ) : (
        <Card padding="none" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 text-secondary-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Paid On</th>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {items.map((it) => (
                <tr key={it._id} className="hover:bg-secondary-50/50">
                  <td className="px-4 py-3 text-secondary-600">{new Date(it.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 font-medium text-secondary">
                    {it.employeeName}
                    {it.designation && <span className="block text-xs text-secondary-400">{it.designation}</span>}
                  </td>
                  <td className="px-4 py-3 text-secondary-600">{it.month}</td>
                  <td className="px-4 py-3 text-secondary-600 capitalize">{it.mode?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-secondary">{money(it.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(it._id)} className="text-secondary-400 hover:text-danger" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-modal p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-secondary-100">
              <h2 className="text-xl font-heading font-semibold text-secondary">Add Salary Payment</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-secondary-100 rounded-lg"><X size={20} className="text-secondary-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Employee Name *</label>
                  <input className="input" value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} placeholder="Employee name" required />
                </div>
                <div>
                  <label className="label">Designation</label>
                  <input className="input" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Operator (optional)" />
                </div>
                <div>
                  <label className="label">Salary Month *</label>
                  <input type="month" className="input" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Paid On *</label>
                  <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Amount (₹) *</label>
                  <input type="number" min="0" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Mode</label>
                  <select className="input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                    {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Reference</label>
                  <input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Txn / cheque no. (optional)" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Notes</label>
                  <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-secondary-100">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Salaries;
