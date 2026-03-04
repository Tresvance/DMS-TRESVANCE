import { useState, useEffect, useCallback } from 'react';
import { usersAPI, clinicsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Table, Spinner, EmptyState, ConfirmDialog, Modal, FormField, SearchBar } from '../components/UI';
import { Plus, Edit2, Trash2, Users as UsersIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Users() {
  const { user: me } = useAuth();
  const isSuperAdmin  = me?.role === 'SUPER_ADMIN';
  const isClinicAdmin = me?.role === 'CLINIC_ADMIN';

  // Super Admin creates CLINIC_ADMIN | Clinic Admin creates DOCTOR/RECEPTION
  const allowedRoles = isSuperAdmin
    ? [{ value: 'CLINIC_ADMIN', label: 'Clinic Admin' }]
    : [
        { value: 'DOCTOR',    label: 'Doctor' },
        { value: 'RECEPTION', label: 'Receptionist' },
      ];

  const INITIAL = {
    first_name: '', last_name: '', email: '', phone: '',
    role: allowedRoles[0]?.value || '',
    clinic: '', password: '', is_active: true,
  };

  const [users, setUsers]         = useState([]);
  const [clinics, setClinics]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]           = useState(INITIAL);
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]   = useState(false);

  const fc = (f) => (e) => setForm(v => ({ ...v, [f]: e.target.value }));

  const pageTitle = isSuperAdmin ? 'Clinic Admins' : 'Staff Management';
  const addLabel  = isSuperAdmin ? '+ Add Clinic Admin' : '+ Add Staff';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = isSuperAdmin
        ? { role: 'CLINIC_ADMIN', search }
        : { search };
      const [uRes, cRes] = await Promise.all([
        usersAPI.list(params),
        isSuperAdmin ? clinicsAPI.list() : Promise.resolve({ data: [] }),
      ]);
      setUsers(uRes.data.results || uRes.data);
      setClinics(cRes.data.results || cRes.data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [search, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setForm({ ...INITIAL, role: allowedRoles[0]?.value || '' });
    setEditId(null); setModalOpen(true);
  };

  const openEdit = (u) => {
    setForm({
      first_name: u.first_name, last_name: u.last_name,
      email: u.email, phone: u.phone || '',
      role: u.role, clinic: u.clinic || '',
      password: '', is_active: u.is_active,
    });
    setEditId(u.id); setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.email) { toast.error('Fill required fields'); return; }
    if (!editId && !form.password)       { toast.error('Password is required'); return; }
    setSaving(true);
    const payload = { ...form };
    if (!payload.password) delete payload.password;
    if (!payload.clinic)   delete payload.clinic;
    try {
      if (editId) await usersAPI.update(editId, payload);
      else        await usersAPI.create(payload);
      toast.success(editId ? 'Updated' : 'Created');
      setModalOpen(false); load();
    } catch (err) {
      toast.error(err.response?.data?.email?.[0] || err.response?.data?.non_field_errors?.[0] || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await usersAPI.delete(deleteTarget.id); toast.success('Deleted'); setDeleteTarget(null); load(); }
    catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  const badgeColor = (role) => ({
    SUPER_ADMIN:  'bg-red-100 text-red-700',
    CLINIC_ADMIN: 'bg-purple-100 text-purple-700',
    DOCTOR:       'bg-green-100 text-green-700',
    RECEPTION:    'bg-blue-100 text-blue-700',
  }[role] || 'bg-gray-100 text-gray-700');

  return (
    <div>
      <PageHeader title={pageTitle} subtitle={`${users.length} users`}
        action={<button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />{addLabel}</button>}
      />

      <div className="card">
        <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Search users..." /></div>
        {loading ? <Spinner /> : users.length === 0 ? <EmptyState message="No users found" icon={UsersIcon} /> : (
          <Table headers={['Name', 'Email', 'Role', 'Clinic', 'Phone', 'Status', 'Actions']}>
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{u.full_name}</td>
                <td className="table-cell text-gray-500">{u.email}</td>
                <td className="table-cell"><span className={`badge ${badgeColor(u.role)}`}>{u.role.replace('_', ' ')}</span></td>
                <td className="table-cell">{u.clinic_name || '—'}</td>
                <td className="table-cell">{u.phone || '—'}</td>
                <td className="table-cell">{u.is_active ? <span className="badge-green">Active</span> : <span className="badge-gray">Inactive</span>}</td>
                <td className="table-cell">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteTarget(u)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editId ? 'Edit User' : (isSuperAdmin ? 'Add Clinic Admin' : 'Add Staff')}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required><input value={form.first_name} onChange={fc('first_name')} className="input-field" /></FormField>
            <FormField label="Last Name"  required><input value={form.last_name}  onChange={fc('last_name')}  className="input-field" /></FormField>
            <FormField label="Email"      required><input type="email" value={form.email} onChange={fc('email')} className="input-field" /></FormField>
            <FormField label="Phone"><input value={form.phone} onChange={fc('phone')} className="input-field" /></FormField>

            <FormField label="Role">
              <select value={form.role} onChange={fc('role')} className="input-field">
                {allowedRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </FormField>

            {/* Super Admin assigns a clinic to the Clinic Admin */}
            {isSuperAdmin && (
              <FormField label="Assign Clinic" required>
                <select value={form.clinic} onChange={fc('clinic')} className="input-field">
                  <option value="">Select clinic</option>
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.clinic_name}</option>)}
                </select>
              </FormField>
            )}
          </div>

          <FormField label={editId ? 'New Password (leave blank to keep)' : 'Password'}>
            <input type="password" value={form.password} onChange={fc('password')} className="input-field" placeholder="••••••••" />
          </FormField>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Delete User" message={`Delete "${deleteTarget?.full_name}"? This cannot be undone.`} />
    </div>
  );
}
