import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Shield, Eye, EyeOff } from 'lucide-react';
import api, { rolesAPI } from '../services/api';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Card from '../components/ui/Card';

// Available menu permissions
const availablePermissions = [
  { id: 'dashboard', label: 'Dashboard', group: 'Main' },
  { id: 'products', label: 'Products', group: 'Masters' },
  { id: 'raw-materials', label: 'Raw Materials', group: 'Masters' },
  { id: 'categories', label: 'Categories', group: 'Masters' },
  { id: 'customers', label: 'Customers', group: 'Masters' },
  { id: 'vendors', label: 'Vendors', group: 'Masters' },
  { id: 'warehouses', label: 'Warehouses', group: 'Masters' },
  { id: 'purchase-orders', label: 'Purchases', group: 'Operations' },
  { id: 'production', label: 'Production', group: 'Operations' },
  { id: 'invoices', label: 'Sales', group: 'Operations' },
  { id: 'delivery-challans', label: 'Delivery Challans', group: 'Operations' },
  { id: 'pos', label: 'POS / Quick Sale', group: 'Operations' },
  { id: 'movements', label: 'Stock Movements', group: 'Inventory' },
  { id: 'transfers', label: 'Transfers', group: 'Inventory' },
  { id: 'labels', label: 'Labels & QR', group: 'Inventory' },
  { id: 'expenses', label: 'Expenses', group: 'Accounts' },
  { id: 'payments', label: 'Payments', group: 'Accounts' },
  { id: 'receipts', label: 'Receipts', group: 'Accounts' },
  { id: 'investments', label: 'Investments', group: 'Accounts' },
  { id: 'salaries', label: 'Salary Payments', group: 'Accounts' },
  { id: 'reports', label: 'Reports', group: 'Reports & Tools' },
  { id: 'settings', label: 'Settings', group: 'Reports & Tools' },
];

// Per-role default module access (mirrors backend config/rolePermissions.js).
const ROLE_DEFAULT_PERMISSIONS = {
  admin: availablePermissions.map((p) => p.id),
  manager: [
    'dashboard', 'products', 'raw-materials', 'categories', 'customers', 'vendors',
    'warehouses', 'purchase-orders', 'production', 'invoices', 'delivery-challans',
    'pos', 'movements', 'transfers', 'labels', 'expenses', 'payments', 'receipts', 'reports',
  ],
  staff: [
    'dashboard', 'products', 'raw-materials', 'production', 'invoices',
    'delivery-challans', 'pos', 'movements',
  ],
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    isActive: true,
  });

  const [roleOptions, setRoleOptions] = useState([
    { value: 'staff', label: 'Staff' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Admin' },
  ]);
  // Permissions per role key, so "Apply role defaults" works for custom roles too.
  const [rolePerms, setRolePerms] = useState({});

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await rolesAPI.getAll();
      const list = res.data.data || [];
      if (list.length) {
        setRoleOptions(list.map((r) => ({ value: r.key, label: r.name })));
        setRolePerms(Object.fromEntries(list.map((r) => [r.key, r.permissions || []])));
      }
    } catch (error) {
      // Keep the built-in role options as fallback.
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error('Password is required for new users');
      return;
    }

    try {
      if (editingUser) {
        const updateData = { ...formData };
        delete updateData.password; // Don't update password through this endpoint
        await api.put(`/users/${editingUser._id}`, updateData);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', formData);
        toast.success('User created successfully');
      }

      fetchUsers();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save user');
      console.error(error);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role || 'staff',
      isActive: user.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (user) => {
    if (user.isOwner) {
      toast.error('Cannot delete owner account');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${user.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/users/${user._id}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
      console.error(error);
    }
  };

  const handleManagePermissions = (user) => {
    setEditingUser(user);
    setSelectedPermissions(user.permissions || []);
    setShowPermissionsModal(true);
  };

  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSelectAllInGroup = (group) => {
    const groupPermissions = availablePermissions
      .filter((p) => p.group === group)
      .map((p) => p.id);

    const allSelected = groupPermissions.every((id) =>
      selectedPermissions.includes(id)
    );

    if (allSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((id) => !groupPermissions.includes(id))
      );
    } else {
      setSelectedPermissions((prev) => [
        ...new Set([...prev, ...groupPermissions]),
      ]);
    }
  };

  const handleSavePermissions = async () => {
    try {
      await api.put(`/users/${editingUser._id}/permissions`, {
        permissions: selectedPermissions,
      });
      toast.success('Permissions updated successfully');
      fetchUsers();
      setShowPermissionsModal(false);
      setEditingUser(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update permissions');
      console.error(error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setShowPassword(false);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'staff',
      isActive: true,
    });
  };

  const handleClosePermissionsModal = () => {
    setShowPermissionsModal(false);
    setEditingUser(null);
    setSelectedPermissions([]);
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group permissions by category
  const permissionGroups = availablePermissions.reduce((acc, permission) => {
    if (!acc[permission.group]) {
      acc[permission.group] = [];
    }
    acc[permission.group].push(permission);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">User Management</h1>
          <p className="text-sm text-primary-600 mt-1">Manage users and their menu access permissions</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <Card>
        <Card.Content>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </Card.Content>
      </Card>

      {/* Users List */}
      <Card>
        <Card.Content>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-secondary-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-secondary-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-primary-900">
                          {user.name}
                          {user.isOwner && (
                            <span className="ml-2 text-xs text-secondary-500">(Owner)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-600">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                          {user.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-600">
                          {user.permissions?.length || 0} menu items
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleManagePermissions(user)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Manage Permissions"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!user.isOwner && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingUser ? 'Edit User' : 'Add New User'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., John Doe"
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="e.g., john@example.com"
            required
          />

          <div className="relative">
            <Input
              label={editingUser ? 'Password (leave blank to keep current)' : 'Password'}
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter password"
              required={!editingUser}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-secondary-400 hover:text-secondary-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={roleOptions}
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-secondary-700">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit">
              {editingUser ? 'Update' : 'Create'} User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        isOpen={showPermissionsModal}
        onClose={handleClosePermissionsModal}
        title={`Manage Permissions - ${editingUser?.name}`}
        size="xl"
      >
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <p className="text-sm text-secondary-600 flex-1 min-w-[12rem]">
              Select which menu items this user can access. Users will only see the selected menu items in their navigation.
            </p>
            {editingUser?.role && (rolePerms[editingUser.role] || ROLE_DEFAULT_PERMISSIONS[editingUser.role]) && (
              <button
                type="button"
                onClick={() => setSelectedPermissions(rolePerms[editingUser.role] || ROLE_DEFAULT_PERMISSIONS[editingUser.role])}
                className="text-xs font-medium text-primary-600 hover:text-primary-800 border border-primary-200 rounded-lg px-3 py-1.5 whitespace-nowrap"
              >
                Apply {editingUser.role} defaults
              </button>
            )}
          </div>

          {Object.entries(permissionGroups).map(([group, permissions]) => (
            <div key={group} className="border border-secondary-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-primary-900">{group}</h3>
                <button
                  type="button"
                  onClick={() => handleSelectAllInGroup(group)}
                  className="text-xs text-primary-600 hover:text-primary-800"
                >
                  {permissions.every((p) => selectedPermissions.includes(p.id))
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {permissions.map((permission) => (
                  <label
                    key={permission.id}
                    className="flex items-center space-x-2 p-2 hover:bg-secondary-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.id)}
                      onChange={() => handlePermissionToggle(permission.id)}
                      className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-secondary-700">{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-4 border-t border-secondary-200">
            <p className="text-sm text-secondary-600">
              Selected: {selectedPermissions.length} / {availablePermissions.length}
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={handleClosePermissionsModal}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSavePermissions}>
                Save Permissions
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
