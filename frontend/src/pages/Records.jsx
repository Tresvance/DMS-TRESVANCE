import { useState, useEffect, useCallback } from 'react';
import { recordsAPI, patientsAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Table, Spinner, EmptyState, ConfirmDialog, Modal, FormField, SearchBar } from '../components/UI';
import ClinicalNotesManager from '../components/ClinicalNotesManager';
import AdvancedSearch from '../components/AdvancedSearch';
import { Plus, Edit2, Trash2, FileText, Loader2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_FORM = { patient: '', doctor: '', diagnosis: '', treatment_plan: '', prescription: '', procedures_done: '', next_visit_date: '' };

export default function Records() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [notesTarget, setNotesTarget] = useState(null);
  const canEdit = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR'].includes(user?.role);

  const fc = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Map patient-specific filters to backend keys (patient__ prefix)
      const queryParams = { ...params };
      if (queryParams.patient_id) { queryParams.patient__patient_id = queryParams.patient_id; delete queryParams.patient_id; }
      if (queryParams.phone) { queryParams.patient__phone = queryParams.phone; delete queryParams.phone; }
      if (queryParams.email) { queryParams.patient__email = queryParams.email; delete queryParams.email; }
      if (queryParams.date_of_birth) { queryParams.patient__date_of_birth = queryParams.date_of_birth; delete queryParams.date_of_birth; }
      if (queryParams.gender) { queryParams.patient__gender = queryParams.gender; delete queryParams.gender; }

      const [rRes, pRes, dRes] = await Promise.all([
        recordsAPI.list(queryParams),
        patientsAPI.list({ page_size: 200 }),
        usersAPI.list({ role: 'DOCTOR' }),
      ]);
      setRecords(rRes.data.results || rRes.data);
      setPatients(pRes.data.results || pRes.data);
      setDoctors(dRes.data.results || dRes.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (r) => {
    setForm({ patient: r.patient, doctor: r.doctor, diagnosis: r.diagnosis, treatment_plan: r.treatment_plan, prescription: r.prescription || '', procedures_done: r.procedures_done || '', next_visit_date: r.next_visit_date || '' });
    setEditId(r.id); setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.patient || !form.diagnosis || !form.treatment_plan) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (user?.role === 'DOCTOR') payload.doctor = user.id;
      if (editId) await recordsAPI.update(editId, payload); else await recordsAPI.create(payload);
      toast.success(editId ? 'Record updated' : 'Record created');
      setModalOpen(false); load();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await recordsAPI.delete(deleteTarget.id); toast.success('Record deleted'); setDeleteTarget(null); load(); }
    catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader title="Medical Records" subtitle={`${records.length} records`}
        action={canEdit && <button onClick={() => { setForm(INITIAL_FORM); setEditId(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Record</button>}
      />
      <div className="mb-4">
        <AdvancedSearch 
          onSearch={setParams} 
          onClear={() => setParams({ search: '' })}
          placeholder="Search by patient name, diagnosis, ID..."
        />
      </div>
      <div className="card">
        {loading ? <Spinner /> : records.length === 0 ? <EmptyState message="No medical records found" icon={FileText} /> : (
          <Table headers={['Patient', 'Doctor', 'Diagnosis', 'Treatment', 'Next Visit', 'Date', ...(canEdit ? ['Actions'] : [])]}>
            {records.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{r.patient_name}</td>
                <td className="table-cell">{r.doctor_name}</td>
                <td className="table-cell max-w-xs truncate">{r.diagnosis}</td>
                <td className="table-cell max-w-xs truncate text-gray-500">{r.treatment_plan}</td>
                <td className="table-cell">{r.next_visit_date ? new Date(r.next_visit_date).toLocaleDateString() : '—'}</td>
                <td className="table-cell text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                {canEdit && (
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => setNotesTarget(r)} title="Clinical Notes" className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><MessageSquare className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(r)} title="Edit Record" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget(r)} title="Delete Record" className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </Table>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Record' : 'New Medical Record'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Patient" required>
              <select value={form.patient} onChange={fc('patient')} className="input-field">
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </FormField>
            {user?.role !== 'DOCTOR' && (
              <FormField label="Doctor" required>
                <select value={form.doctor} onChange={fc('doctor')} className="input-field">
                  <option value="">Select doctor</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
                </select>
              </FormField>
            )}
          </div>
          <FormField label="Diagnosis" required>
            <textarea value={form.diagnosis} onChange={fc('diagnosis')} className="input-field" rows={2} placeholder="Clinical diagnosis..." />
          </FormField>
          <FormField label="Treatment Plan" required>
            <textarea value={form.treatment_plan} onChange={fc('treatment_plan')} className="input-field" rows={2} placeholder="Treatment plan..." />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Prescription">
              <textarea value={form.prescription} onChange={fc('prescription')} className="input-field" rows={2} placeholder="Medications prescribed..." />
            </FormField>
            <FormField label="Procedures Done">
              <textarea value={form.procedures_done} onChange={fc('procedures_done')} className="input-field" rows={2} placeholder="Procedures performed..." />
            </FormField>
          </div>
          <FormField label="Next Visit Date">
            <input type="date" value={form.next_visit_date} onChange={fc('next_visit_date')} className="input-field" />
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editId ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete Record" message="Delete this medical record permanently?" />

      <Modal isOpen={!!notesTarget} onClose={() => { setNotesTarget(null); load(); }} title="Clinical Visit Notes" size="xl">
        {notesTarget && (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div>
                <h3 className="font-bold text-blue-900">{notesTarget.patient_name}</h3>
                <p className="text-sm text-blue-700">{notesTarget.diagnosis}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Visit Date</p>
                <p className="font-semibold text-blue-800">{new Date(notesTarget.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <ClinicalNotesManager recordId={notesTarget.id} />
          </div>
        )}
      </Modal>
    </div>
  );
}
