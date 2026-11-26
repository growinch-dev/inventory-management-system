import { useState, useEffect } from 'react';
import { Plus, TrendingUp, Trash2, X, IndianRupee } from 'lucide-react';
import { investmentsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { PageHeader, Button, Card, LoadingSpinner, EmptyState } from '../components/ui';

const TYPES = [
  { value: 'capital', label: 'Capital' },
  { value: 'owner_contribution', label: 'Owner Contribution' },
  { value: 'loan', label: 'Loan' },
  { value: 'other', label: 'Other' },
];
const MODES = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
];
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const today = () => new Date().toISOString().split('T')[0];
const emptyForm = { date: today(), investorName: '', type: 'capital', amount: '', mode: 'bank_transfer', reference: '', notes: '' };

const Investments = () => {
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
      const res = await investmentsAPI.getAll();
      setItems(res.data.data || []);
      setTotalAmount(res.data.totalAmount || 0);
    } catch (error) {
      toast.error('Failed to load investments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.investorName || !form.amount) return toast.error('Investor name and amount are required');
    try {
      setSaving(true);
      await investmentsAPI.create({ ...form, amount: Number(form.amount) });
      toast.success('Investment recorded');
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
    if (!window.confirm('Delete this investment record?')) return;
    try {
      await investmentsAPI.delete(id);
      toast.success('Deleted');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  const typeLabel = (v) => TYPES.find((t) => t.value === v)?.label || v;

  return (
    <div className="space-y-6">
      <PageHeader title="Investments" description="Capital, owner contributions and loans into the business">
        <Button onClick={() => { setForm(emptyForm); setShowModal(true); }} icon={Plus}>Add Investment</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500">Total Invested</p>
              <p className="text-2xl font-bold text-secondary">{money(totalAmount)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-success" />
          </div>
        </Card>
        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-500">Records</p>
              <p className="text-2xl font-bold text-secondary">{items.length}</p>
            </div>
            <IndianRupee className="w-8 h-8 text-primary" />
          </div>
        </Card>
      </div>

      {loading ? (
        <LoadingSpinner.Container className="h-64" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={TrendingUp} title="No investments recorded" description="Add your first capital or owner contribution" actionText="Add Investment" actionOnClick={() => setShowModal(true)} actionIcon={Plus} />
        </Card>
      ) : (
        <Card padding="none" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 text-secondary-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Investor</th>
                <th className="px-4 py-3 font-medium">Type</th>
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
                    {it.investorName}
                    {it.reference && <span className="block text-xs text-secondary-400">Ref: {it.reference}</span>}
                  </td>
                  <td className="px-4 py-3 text-secondary-600">{typeLabel(it.type)}</td>
                  <td className="px-4 py-3 text-secondary-600 capitalize">{it.mode?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-success">{money(it.amount)}</td>
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
              <h2 className="text-xl font-heading font-semibold text-secondary">Add Investment</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-secondary-100 rounded-lg"><X size={20} className="text-secondary-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Amount (₹) *</label>
                  <input type="number" min="0" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Investor Name *</label>
                  <input className="input" value={form.investorName} onChange={(e) => setForm({ ...form, investorName: e.target.value })} placeholder="Who invested" required />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
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

export default Investments;
