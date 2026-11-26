import { useState, useEffect } from 'react';
import { Plus, Building2, Copy, Check, ExternalLink, X, Users } from 'lucide-react';
import { adminAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { PageHeader, Button, Card, LoadingSpinner, EmptyState, Badge } from '../components/ui';

const emptyForm = {
  companyName: '',
  slug: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
  phone: '',
};

const Organizations = () => {
  const { user } = useAuthStore();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [result, setResult] = useState(null); // { loginUrl, admin, tenant }
  const [copied, setCopied] = useState('');

  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) fetchTenants();
    else setLoading(false);
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getTenants();
      setTenants(res.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await adminAPI.createTenant(form);
      setResult(res.data.data);
      toast.success('Customer organization created');
      fetchTenants();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create organization');
    } finally {
      setSaving(false);
    }
  };

  const openModal = () => {
    setForm(emptyForm);
    setResult(null);
    setShowModal(true);
  };

  const origin = window.location.origin;

  if (!isSuperAdmin) {
    return (
      <Card>
        <EmptyState
          icon={Building2}
          title="Not authorized"
          description="Only the GrowInch platform owner (super admin) can manage customer organizations."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Organizations" description="Onboard and manage customer companies">
        <Button onClick={openModal} icon={Plus}>Add Customer</Button>
      </PageHeader>

      {loading ? (
        <LoadingSpinner.Container className="h-64" />
      ) : tenants.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No organizations yet"
            description="Onboard your first customer to get started"
            actionText="Add Customer"
            actionOnClick={openModal}
            actionIcon={Plus}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map((t) => {
            const url = `${origin}/${t.slug}`;
            return (
              <Card key={t.id} padding="lg">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-secondary truncate" title={t.name}>{t.name}</h3>
                    <p className="text-xs text-secondary-500">{t.email}</p>
                  </div>
                  <Badge variant={t.isActive ? 'success' : 'gray'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="flex items-center gap-2 bg-secondary-50 rounded-lg px-3 py-2 text-sm">
                  <span className="truncate font-mono text-secondary-700 flex-1" title={url}>/{t.slug}</span>
                  <button onClick={() => copy(url, t.id)} className="text-secondary-400 hover:text-primary" title="Copy login link">
                    {copied === t.id ? <Check size={15} className="text-success" /> : <Copy size={15} />}
                  </button>
                  <a href={url} target="_blank" rel="noreferrer" className="text-secondary-400 hover:text-primary" title="Open login">
                    <ExternalLink size={15} />
                  </a>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-secondary-500">
                  <Users size={13} /> {t.userCount} user{t.userCount === 1 ? '' : 's'}
                  {t.subscriptionPlan && <span className="ml-auto capitalize">{t.subscriptionPlan}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-modal p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-secondary-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-xl font-heading font-semibold text-secondary">
                {result ? 'Customer Created' : 'Onboard New Customer'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-secondary-100 rounded-lg" aria-label="Close">
                <X size={20} className="text-secondary-500" />
              </button>
            </div>

            {result ? (
              <div className="p-6 space-y-4">
                <p className="text-sm text-secondary-600">Share this link and login with the customer:</p>
                <div className="space-y-3">
                  <div>
                    <label className="label">Login link</label>
                    <div className="flex items-center gap-2 bg-secondary-50 rounded-lg px-3 py-2">
                      <span className="truncate font-mono text-sm text-primary flex-1">{result.loginUrl}</span>
                      <button onClick={() => copy(result.loginUrl, 'url')} className="text-secondary-400 hover:text-primary">
                        {copied === 'url' ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-secondary-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-secondary-400">Admin email</p>
                      <p className="font-medium text-secondary truncate">{result.admin.email}</p>
                    </div>
                    <div className="bg-secondary-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-secondary-400">Temp password</p>
                      <p className="font-medium text-secondary">{form.adminPassword}</p>
                    </div>
                  </div>
                  <p className="text-xs text-secondary-400">Ask the customer to change this password after first login.</p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="secondary" onClick={() => { setResult(null); setForm(emptyForm); }}>Add Another</Button>
                  <Button onClick={() => setShowModal(false)}>Done</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="label">Company Name *</label>
                  <input className="input" value={form.companyName} required
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="e.g. Customer 1 Beverages" />
                </div>
                <div>
                  <label className="label">URL Slug (optional)</label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-secondary-400 font-mono">{origin}/</span>
                    <input className="input font-mono" value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      placeholder="auto from name (e.g. customer1)" />
                  </div>
                  <p className="text-xs text-secondary-400 mt-1">Leave blank to auto-generate from the company name.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Admin Name *</label>
                    <input className="input" value={form.adminName} required
                      onChange={(e) => setForm({ ...form, adminName: e.target.value })} placeholder="Full name" />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 ..." />
                  </div>
                </div>
                <div>
                  <label className="label">Admin Email *</label>
                  <input className="input" type="email" value={form.adminEmail} required
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="admin@customer.com" />
                </div>
                <div>
                  <label className="label">Temporary Password *</label>
                  <input className="input" value={form.adminPassword} required minLength={6}
                    onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="At least 6 characters" />
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-secondary-100">
                  <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button type="submit" loading={saving}>Create Organization</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;
