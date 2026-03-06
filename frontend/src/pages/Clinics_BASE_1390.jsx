import { useState, useEffect, useCallback } from 'react';
import { clinicsAPI } from '../services/api';
import { PageHeader, Table, Spinner, EmptyState, ConfirmDialog, Modal, FormField, SearchBar } from '../components/UI';
import { Plus, Edit2, Trash2, Building2, Loader2, Globe, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL = {
  clinic_name: '', clinic_code: '', registration_number: '',
  address: '', phone: '', email: ''
};

// Auto-generate code from clinic name
function nameToCode(name) {
  return name.replace(/[^a-zA-Z0-9\s]/g, '').trim().toLowerCase().split(/\s+/)[0]?.slice(0, 6) || '';
}

export default function Clinics() {
  const [clinics,      setClinics]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [form,         setForm]         = useState(INITIAL);
  const [editId,       setEditId]       = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [copied,       setCopied]       = useState(null);

  const fc = (f) => (e) => {
    const val = e.target.value;
    setForm(v => {
      const updated = { ...v, [f]: val };
      // Auto-fill code from name if code hasn't been manually edited
      if (f === 'clinic_name' && !editId) {
        updated.clinic_code = nameToCode(val);
      }
      // Sanitise code field — only lowercase alphanumeric
      if (f === 'clinic_code') {
        updated.clinic_code = val.replace(/[^a-z0-9]/g, '').toLowerCase();
      }
      return updated;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await clinicsAPI.list({ search });
      setClinics(data.results || data);
    } catch { toast.error('Failed to load clinics'); }
    finally   { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(INITIAL); setEditId(null); setModalOpen(true); };

  const openEdit = (c) => {
    setForm({
      clinic_name:         c.clinic_name,
      clinic_code:         c.clinic_code,
      registration_number: c.registration_number,
      address:             c.address,
      phone:               c.phone,
      email:               c.email,
    });
    setEditId(c.id);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.clinic_name || !form.registration_number) {
      toast.error('Clinic name and registration number are required');
      return;
    }
    if (!form.clinic_code) {
      toast.error('Clinic code is required for subdomain');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await clinicsAPI.update(editId, form);
        toast.success('Clinic updated');
      } else {
        const { data } = await clinicsAPI.create(form);
        toast.success(`Clinic created! Subdomain: ${data.subdomain}`);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      const errs = err.response?.data;
      if (errs?.clinic_code)         toast.error(errs.clinic_code[0]);
      else if (errs?.registration_number) toast.error(errs.registration_number[0]);
      else toast.error('Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await clinicsAPI.delete(deleteTarget.id);
      toast.success('Clinic deleted');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  const copySubdomain = (subdomain, id) => {
    navigator.clipboard.writeText(subdomain);
    setCopied(id);
    toast.success('Subdomain copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  const previewSubdomain = form.clinic_code ? `${form.clinic_code}.tresvance.com` : '';

  return (
    <div>
      <PageHeader
        title="Clinics"
        subtitle={`${clinics.length} clinic${clinics.length !== 1 ? 's' : ''}`}
        action={
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Clinic
          </button>
        }
      />

      <div className="card">
        <div className="mb-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search clinics..." />
        </div>

        {loading ? <Spinner /> : clinics.length === 0 ? (
          <EmptyState message="No clinics found" icon={Building2} />
        ) : (
          <Table headers={['Clinic Name', 'Subdomain', 'Reg. Number', 'Phone', 'Email', 'Staff', 'Status', 'Actions']}>
            {clinics.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{c.clinic_name}</td>

                {/* Subdomain cell */}
                <td className="table-cell">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {c.subdomain}
                    </span>
                    <button
                      onClick={() => copySubdomain(c.subdomain, c.id)}
                      className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Copy subdomain"
                    >
                      {copied === c.id
                        ? <Check className="w-3.5 h-3.5 text-green-500" />
                        : <Copy className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                </td>

                <td className="table-cell font-mono text-xs">{c.registration_number}</td>
                <td className="table-cell">{c.phone}</td>
                <td className="table-cell text-blue-600">{c.email}</td>
                <td className="table-cell">{c.staff_count} staff</td>
                <td className="table-cell">
                  {c.is_active
                    ? <span className="badge-green">Active</span>
                    : <span className="badge-gray">Inactive</span>}
                </td>
                <td className="table-cell">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Clinic' : 'Add Clinic'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Clinic Name" required>
              <input
                value={form.clinic_name}
                onChange={fc('clinic_name')}
                className="input-field"
                placeholder="e.g. Lake Dental"
              />
            </FormField>

            <FormField label="Clinic Code" required hint="Used for subdomain — letters & numbers only">
              <div className="relative">
                <input
                  value={form.clinic_code}
                  onChange={fc('clinic_code')}
                  className="input-field pr-28"
                  placeholder="e.g. lak"
                  maxLength={20}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">
                  .tresvance.com
                </span>
              </div>
            </FormField>

            <FormField label="Registration Number" required>
              <input
                value={form.registration_number}
                onChange={fc('registration_number')}
                className="input-field"
              />
            </FormField>

            <FormField label="Phone">
              <input value={form.phone} onChange={fc('phone')} className="input-field" />
            </FormField>

            <FormField label="Email">
              <input type="email" value={form.email} onChange={fc('email')} className="input-field" />
            </FormField>
          </div>

          <FormField label="Address">
            <textarea value={form.address} onChange={fc('address')} className="input-field" rows={2} />
          </FormField>

          {/* Subdomain preview */}
          {previewSubdomain && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
              <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-blue-600 font-medium">Subdomain will be:</p>
                <p className="font-mono text-sm text-blue-800 font-bold">{previewSubdomain}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editId ? 'Update Clinic' : 'Create Clinic'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Clinic"
        message={`Delete "${deleteTarget?.clinic_name}" (${deleteTarget?.subdomain})? All associated data will be affected.`}
      />
    </div>
  );
}