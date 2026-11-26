import { useState, useEffect, useMemo } from 'react';
import { Plus, Save, Trash2, Shield, Loader2, Lock } from 'lucide-react';
import { rolesAPI } from '../services/api';
import { MODULE_PERMISSIONS } from '../constants';
import toast from 'react-hot-toast';

const groupedModules = MODULE_PERMISSIONS.reduce((acc, m) => {
  (acc[m.group] = acc[m.group] || []).push(m);
  return acc;
}, {});

const RolesManager = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [perms, setPerms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [adding, setAdding] = useState(false);

  const selected = useMemo(() => roles.find((r) => r._id === selectedId), [roles, selectedId]);

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (selected) setPerms(selected.permissions || []);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await rolesAPI.getAll();
      const list = res.data.data || [];
      setRoles(list);
      setSelectedId((prev) => prev || list[0]?._id || null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const togglePerm = (id) =>
    setPerms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const toggleGroup = (groupItems) => {
    const ids = groupItems.map((m) => m.id);
    const allOn = ids.every((id) => perms.includes(id));
    setPerms((prev) => (allOn ? prev.filter((p) => !ids.includes(p)) : [...new Set([...prev, ...ids])]));
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      const res = await rolesAPI.update(selected._id, { permissions: perms });
      setRoles((prev) => prev.map((r) => (r._id === selected._id ? res.data.data : r)));
      toast.success(`${selected.name} access updated`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    try {
      setAdding(true);
      const res = await rolesAPI.create({ name: newRoleName.trim(), permissions: ['dashboard'] });
      setRoles((prev) => [...prev, res.data.data]);
      setSelectedId(res.data.data._id);
      setNewRoleName('');
      toast.success('Role created');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create role');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || selected.isSystem) return;
    if (!window.confirm(`Delete role "${selected.name}"? Its users move to Staff.`)) return;
    try {
      await rolesAPI.delete(selected._id);
      const remaining = roles.filter((r) => r._id !== selected._id);
      setRoles(remaining);
      setSelectedId(remaining[0]?._id || null);
      toast.success('Role deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete role');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-secondary-400">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading roles...
      </div>
    );
  }

  const dirty = selected && JSON.stringify([...perms].sort()) !== JSON.stringify([...(selected.permissions || [])].sort());

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Role list */}
      <div className="space-y-3">
        <div className="space-y-1">
          {roles.map((role) => (
            <button
              key={role._id}
              onClick={() => setSelectedId(role._id)}
              className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-left transition-colors ${
                selectedId === role._id ? 'bg-primary text-white' : 'text-secondary-700 hover:bg-secondary-50'
              }`}
            >
              <Shield size={16} className="flex-shrink-0" />
              <span className="flex-1 font-medium truncate">{role.name}</span>
              {role.isSystem && <Lock size={13} className={selectedId === role._id ? 'text-white/70' : 'text-secondary-300'} />}
            </button>
          ))}
        </div>
        <form onSubmit={handleAdd} className="flex gap-2 pt-2 border-t border-secondary-100">
          <input
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="New role name"
            className="input text-sm flex-1"
          />
          <button type="submit" disabled={adding || !newRoleName.trim()} className="btn-secondary px-3" title="Add role">
            {adding ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          </button>
        </form>
      </div>

      {/* Module toggles */}
      <div className="md:col-span-2">
        {!selected ? (
          <p className="text-secondary-400 text-sm">Select or add a role to set its module access.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-secondary">{selected.name}</h3>
                <p className="text-xs text-secondary-400">
                  {selected.isSystem ? 'Built-in role' : 'Custom role'} · {perms.length} modules enabled
                </p>
              </div>
              {!selected.isSystem && (
                <button onClick={handleDelete} className="text-sm text-danger hover:underline flex items-center gap-1">
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>

            {selected.key === 'admin' && (
              <p className="text-xs text-warning bg-warning-light rounded-lg px-3 py-2">
                Admins can access everything regardless of these toggles.
              </p>
            )}

            <div className="space-y-3 max-h-[46vh] overflow-y-auto pr-1">
              {Object.entries(groupedModules).map(([group, items]) => {
                const allOn = items.every((m) => perms.includes(m.id));
                return (
                  <div key={group} className="border border-secondary-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-secondary">{group}</h4>
                      <button type="button" onClick={() => toggleGroup(items)} className="text-xs text-primary hover:text-primary-dark">
                        {allOn ? 'Clear' : 'All'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {items.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary-50 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={perms.includes(m.id)}
                            onChange={() => togglePerm(m.id)}
                            className="w-4 h-4 text-primary rounded border-secondary-300 focus:ring-primary"
                          />
                          <span className="text-secondary-700">{m.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-secondary-100">
              <button onClick={handleSave} disabled={saving || !dirty} className="btn-primary">
                {saving ? <><Loader2 className="animate-spin mr-2" size={16} /> Saving...</> : <><Save size={16} className="mr-2" /> Save Access</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RolesManager;
