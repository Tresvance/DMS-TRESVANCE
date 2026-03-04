import { useState, useEffect, useCallback } from 'react';
import { clinicsAPI } from '../services/api';
import { PageHeader, Table, Spinner, EmptyState, ConfirmDialog, Modal, FormField, SearchBar } from '../components/UI';
import { Plus, Edit2, Trash2, Building2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL = { clinic_name: '', registration_number: '', address: '', phone: '', email: '' };

export default function Clinics() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fc = (f) => (e) => setForm(v => ({ ...v, [f]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await clinicsAPI.list({ search }); setClinics(data.results || data); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (c) => {
    setForm({ clinic_name: c.clinic_name, registration_number: c.registration_number, address: c.address, phone: c.phone, email: c.email });
    setEditId(c.id); setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.clinic_name || !form.registration_number) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      if (editId) await clinicsAPI.update(editId, form); else await clinicsAPI.create(form);
      toast.success(editId ? 'Clinic updated' : 'Clinic created'); setModalOpen(false); load();
    } catch (err) {
      toast.error(err.response?.data?.registration_number?.[0] || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await clinicsAPI.delete(deleteTarget.id); toast.success('Clinic deleted'); setDeleteTarget(null); load(); }
    catch { toast.error('Delete failed'); } finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader title="Clinics" subtitle={`${clinics.length} clinics`}
        action={<button onClick={() => { setForm(INITIAL); setEditId(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Clinic</button>}
      />
      <div className="card">
        <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Search clinics..." /></div>
        {loading ? <Spinner /> : clinics.length === 0 ? <EmptyState message="No clinics found" icon={Building2} /> : (
          <Table headers={['Clinic Name', 'Reg. Number', 'Phone', 'Email', 'Staff', 'Status', 'Actions']}>
            {clinics.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{c.clinic_name}</td>
                <td className="table-cell font-mono text-xs">{c.registration_number}</td>
                <td className="table-cell">{c.phone}</td>
                <td className="table-cell text-blue-600">{c.email}</td>
                <td className="table-cell">{c.staff_count} staff</td>
                <td className="table-cell">{c.is_active ? <span className="badge-green">Active</span> : <span className="badge-gray">Inactive</span>}</td>
                <td className="table-cell">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Clinic' : 'Add Clinic'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Clinic Name" required><input value={form.clinic_name} onChange={fc('clinic_name')} className="input-field" /></FormField>
            <FormField label="Registration Number" required><input value={form.registration_number} onChange={fc('registration_number')} className="input-field" /></FormField>
            <FormField label="Phone"><input value={form.phone} onChange={fc('phone')} className="input-field" /></FormField>
            <FormField label="Email"><input type="email" value={form.email} onChange={fc('email')} className="input-field" /></FormField>
          </div>
          <FormField label="Address"><textarea value={form.address} onChange={fc('address')} className="input-field" rows={2} /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete Clinic" message={`Delete clinic "${deleteTarget?.clinic_name}"? All associated data will be affected.`} />
    </div>
  );
}
