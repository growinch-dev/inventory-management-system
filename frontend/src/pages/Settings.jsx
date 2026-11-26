import { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Bell,
  Shield,
  Palette,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Camera,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { authAPI, tenantAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import RolesManager from '../components/RolesManager';

const Settings = () => {
  const { t } = useLanguage();
  const { user, setUser, tenant, setTenant } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [logo, setLogo] = useState('');

  // Profile form
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Company settings
  const [companyData, setCompanyData] = useState({
    companyName: '',
    address: '',
    phone: '',
    email: '',
    gstNumber: '',
    panNumber: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailInvoice: true,
    emailLowStock: true,
    emailOrderUpdate: true,
    emailExpiryAlert: true,
    expiryAlertDays: 30,
    pushNotifications: false,
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Load company/organization details from the tenant
  useEffect(() => {
    if (tenant) {
      const a = tenant.address || {};
      setCompanyData((prev) => ({
        ...prev,
        companyName: tenant.name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        gstNumber: tenant.gstNumber || '',
        panNumber: tenant.panNumber || '',
        address: [a.street, a.city, a.state, a.pincode].filter(Boolean).join(', '),
      }));
      setLogo(tenant.settings?.logo || '');
    }
  }, [tenant]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, SVG).');
      return;
    }
    if (file.size > 500 * 1024) {
      toast.error('Logo must be under 500 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.onerror = () => toast.error('Could not read the image file.');
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await authAPI.updateProfile(profileData);
      setUser(response.data.data);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      await authAPI.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await tenantAPI.update({
        name: companyData.companyName,
        email: companyData.email,
        phone: companyData.phone,
        gstNumber: companyData.gstNumber,
        panNumber: companyData.panNumber,
        settings: {
          logo: logo || '',
        },
      });
      setTenant(response.data.data);
      toast.success('Company settings updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update company settings');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Notification preferences updated');
    } catch (error) {
      toast.error('Failed to update notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.isOwner;

  const tabs = [
    { id: 'profile', label: t('settings.profile'), icon: User },
    { id: 'security', label: t('settings.security'), icon: Shield },
    { id: 'company', label: t('settings.company'), icon: Building2 },
    ...(isAdmin ? [{ id: 'roles', label: 'Roles & Access', icon: Shield }] : []),
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-secondary">{t('settings.title')}</h1>
        <p className="text-gray-500">{t('settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={20} />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-secondary mb-6">Profile Information</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                <div className="relative">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50">
                    <Camera size={14} className="text-gray-600" />
                  </button>
                </div>
                <div>
                  <h3 className="font-semibold text-secondary">{user?.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Full Name</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Email Address</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Phone Number</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label">Role</label>
                    <input
                      type="text"
                      value={user?.role || ''}
                      className="input bg-gray-50"
                      disabled
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={18} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} className="mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-secondary mb-6">Change Password</h2>

              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                <div>
                  <label className="label">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      className="input pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      className="input pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      className="input pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={18} />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Company Tab */}
          {activeTab === 'company' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-secondary mb-6">Company Information</h2>

              <form onSubmit={handleCompanySubmit} className="space-y-6">
                {/* Company Logo */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">COMPANY LOGO</h3>
                  <div className="flex items-center gap-5">
                    <div className="w-24 h-24 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {logo ? (
                        <img src={logo} alt="Company logo" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <Building2 size={28} className="text-gray-300" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="btn-secondary cursor-pointer inline-flex items-center">
                          <Camera size={16} className="mr-2" />
                          {logo ? 'Change Logo' : 'Upload Logo'}
                          <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                        </label>
                        {logo && (
                          <button
                            type="button"
                            onClick={() => setLogo('')}
                            className="text-sm text-danger hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG or SVG, under 500&nbsp;KB. Shown in the sidebar and on invoices.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">BASIC INFORMATION</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="label">Company Name</label>
                      <input
                        type="text"
                        value={companyData.companyName}
                        onChange={(e) =>
                          setCompanyData({ ...companyData, companyName: e.target.value })
                        }
                        className="input"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="label">Address</label>
                      <textarea
                        value={companyData.address}
                        onChange={(e) =>
                          setCompanyData({ ...companyData, address: e.target.value })
                        }
                        rows={2}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label">Phone</label>
                      <input
                        type="tel"
                        value={companyData.phone}
                        onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label">Email</label>
                      <input
                        type="email"
                        value={companyData.email}
                        onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                {/* Tax Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">TAX INFORMATION</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">GST Number</label>
                      <input
                        type="text"
                        value={companyData.gstNumber}
                        onChange={(e) =>
                          setCompanyData({ ...companyData, gstNumber: e.target.value })
                        }
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label">PAN Number</label>
                      <input
                        type="text"
                        value={companyData.panNumber}
                        onChange={(e) =>
                          setCompanyData({ ...companyData, panNumber: e.target.value })
                        }
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">BANK DETAILS</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Bank Name</label>
                      <input
                        type="text"
                        value={companyData.bankName}
                        onChange={(e) =>
                          setCompanyData({ ...companyData, bankName: e.target.value })
                        }
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label">Account Number</label>
                      <input
                        type="text"
                        value={companyData.accountNumber}
                        onChange={(e) =>
                          setCompanyData({ ...companyData, accountNumber: e.target.value })
                        }
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label">IFSC Code</label>
                      <input
                        type="text"
                        value={companyData.ifscCode}
                        onChange={(e) =>
                          setCompanyData({ ...companyData, ifscCode: e.target.value })
                        }
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label">Branch</label>
                      <input
                        type="text"
                        value={companyData.branch}
                        onChange={(e) => setCompanyData({ ...companyData, branch: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={18} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} className="mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Roles & Access Tab */}
          {activeTab === 'roles' && isAdmin && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-secondary mb-1">Roles & Module Access</h2>
              <p className="text-sm text-gray-500 mb-6">Control which modules each role can access, and create custom roles.</p>
              <RolesManager />
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-secondary mb-6">Notification Preferences</h2>

              <form onSubmit={handleNotificationSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-secondary">Invoice Emails</p>
                      <p className="text-sm text-gray-500">
                        Receive email notifications when invoices are created or paid
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.emailInvoice}
                        onChange={(e) =>
                          setNotifications({ ...notifications, emailInvoice: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-secondary">Low Stock Alerts</p>
                      <p className="text-sm text-gray-500">
                        Get notified when products are running low on stock
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.emailLowStock}
                        onChange={(e) =>
                          setNotifications({ ...notifications, emailLowStock: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-secondary">Order Updates</p>
                      <p className="text-sm text-gray-500">
                        Receive updates about order status changes
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.emailOrderUpdate}
                        onChange={(e) =>
                          setNotifications({ ...notifications, emailOrderUpdate: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-secondary">Expiry Alerts</p>
                      <p className="text-sm text-gray-500">
                        Get notified when product batches are expiring soon
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={notifications.expiryAlertDays}
                        onChange={(e) =>
                          setNotifications({ ...notifications, expiryAlertDays: parseInt(e.target.value) })
                        }
                        className="select text-sm py-1.5 w-24"
                        disabled={!notifications.emailExpiryAlert}
                      >
                        <option value={7}>7 days</option>
                        <option value={15}>15 days</option>
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                      </select>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.emailExpiryAlert}
                          onChange={(e) =>
                            setNotifications({ ...notifications, emailExpiryAlert: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-secondary">Push Notifications</p>
                      <p className="text-sm text-gray-500">
                        Enable browser push notifications
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.pushNotifications}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            pushNotifications: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={18} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} className="mr-2" />
                        Save Preferences
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
