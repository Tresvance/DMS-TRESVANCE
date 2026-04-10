import { useState, useEffect, useCallback, useMemo } from 'react';
import { appointmentsAPI, patientsAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  PageHeader, Table, Spinner, EmptyState, ConfirmDialog,
  StatusBadge, Modal, FormField, SearchBar
} from '../components/UI';
import { Plus, Edit2, Trash2, Calendar, Loader2, Star, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_FORM = {
  patient: '', doctor: '', appointment_date: '', appointment_time: '09:00',
  reason: '', status: 'Scheduled', notes: '',
};

// ── Helpers ───────────────────────────────────────────
const formatTime12h = (timeStr) => {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':');
  let hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour.toString().padStart(2, '0')}:${m} ${ampm}`;
};

const TimePicker = ({ value, onChange }) => {
  // Parse value (HH:mm) into h, m, ampm
  const [h24, m] = (value || '09:00').split(':');
  let h12 = parseInt(h24) % 12 || 12;
  const ampm = parseInt(h24) >= 12 ? 'PM' : 'AM';

  const handleChange = (newH12, newM, newAmpm) => {
    let h24 = parseInt(newH12);
    if (newAmpm === 'PM' && h24 !== 12) h24 += 12;
    if (newAmpm === 'AM' && h24 === 12) h24 = 0;
    onChange(`${h24.toString().padStart(2, '0')}:${newM}`);
  };

  const minutes = useMemo(() => 
    [...Array(12)].map((_, i) => (i * 5).toString().padStart(2, '0')), []
  );

  return (
    <div className="flex gap-2">
      <select 
        value={h12} 
        onChange={e => handleChange(e.target.value, m, ampm)} 
        className="input-field w-full"
      >
        {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
      </select>
      <select 
        value={m} 
        onChange={e => handleChange(h12, e.target.value, ampm)} 
        className="input-field w-full"
      >
        {minutes.map(min => <option key={min} value={min}>{min}</option>)}
      </select>
      <select 
        value={ampm} 
        onChange={e => handleChange(h12, m, e.target.value)} 
        className="input-field w-full"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const canEdit = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTION'].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, patRes, docRes] = await Promise.all([
        appointmentsAPI.list({ search }),
        patientsAPI.list({ page_size: 200 }),
        usersAPI.list({ role: 'DOCTOR' }),
      ]);
      setAppointments(apptRes.data.results || apptRes.data);
      setPatients(patRes.data.results || patRes.data);
      setDoctors(docRes.data.results || docRes.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(INITIAL_FORM); setEditId(null); setModalOpen(true); };
  const openEdit = (a) => {
    setForm({
      patient: a.patient, doctor: a.doctor, appointment_date: a.appointment_date,
      appointment_time: a.appointment_time?.slice(0, 5) || '09:00', 
      reason: a.reason,
      status: a.status, notes: a.notes || '',
    });
    setEditId(a.id); setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.patient || !form.doctor || !form.appointment_date || !form.appointment_time || !form.reason) {
      toast.error('Fill required fields'); return;
    }
    setSaving(true);
    try {
      if (editId) { await appointmentsAPI.update(editId, form); toast.success('Appointment updated'); }
      else { await appointmentsAPI.create(form); toast.success('Appointment booked'); }
      setModalOpen(false); load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await appointmentsAPI.delete(deleteTarget.id);
      toast.success('Appointment deleted'); setDeleteTarget(null); load();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle={`${appointments.length} total`}
        action={canEdit && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Book Appointment
          </button>
        )}
      />

      <div className="card">
        <div className="mb-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search patient, doctor..." />
        </div>

        {loading ? <Spinner /> : appointments.length === 0 ? (
          <EmptyState message="No appointments found" icon={Calendar} />
        ) : (
          <Table headers={['Patient', 'Doctor', 'Date', 'Time', 'Reason', 'Status', ...(canEdit ? ['Actions'] : [])]}>
            {appointments.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{a.patient_name}</span>
                      {a.patient_is_vip && (
                        <div className="flex items-center bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded text-[10px] font-black border border-amber-200">
                          <Star className="w-3 h-3 fill-amber-500" />
                        </div>
                      )}
                      {a.is_first_visit && (
                        <span className="px-1.5 py-0.5 text-[9px] font-black bg-indigo-600 text-white rounded-md tracking-tight uppercase">First Visit</span>
                      )}
                    </div>
                    {a.patient_is_high_risk && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 uppercase tracking-tighter">
                        <AlertCircle className="w-3 h-3" />
                        Risk: {a.patient_risk_details || 'Critical'}
                      </div>
                    )}
                    <span className="text-[10px] text-gray-400 font-mono uppercase">{a.patient_id_code}</span>
                  </div>
                </td>
                <td className="table-cell">{a.doctor_name}</td>
                <td className="table-cell">{new Date(a.appointment_date).toLocaleDateString()}</td>
                <td className="table-cell font-semibold text-blue-600">{formatTime12h(a.appointment_time)}</td>
                <td className="table-cell text-gray-500 max-w-xs truncate">{a.reason}</td>
                <td className="table-cell"><StatusBadge status={a.status} /></td>
                {canEdit && (
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(a)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget(a)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </Table>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Appointment' : 'Book Appointment'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Patient" required>
              <select name="patient" value={form.patient} onChange={e => setForm(f => ({ ...f, patient: e.target.value }))} className="input-field">
                <option value="">Select patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.patient_id})</option>)}
              </select>
            </FormField>
            <FormField label="Doctor" required>
              <select name="doctor" value={form.doctor} onChange={e => setForm(f => ({ ...f, doctor: e.target.value }))} className="input-field">
                <option value="">Select doctor</option>
                {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
              </select>
            </FormField>
            <FormField label="Date" required>
              <input type="date" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} className="input-field" />
            </FormField>
            <FormField label="Time (AM/PM)" required>
              <TimePicker value={form.appointment_time} onChange={val => setForm(f => ({ ...f, appointment_time: val }))} />
            </FormField>
          </div>
          <FormField label="Reason" required>
            <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="input-field" placeholder="Reason for visit" />
          </FormField>
          <FormField label="Status">
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field">
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Show">No Show</option>
            </select>
          </FormField>
          <FormField label="Notes">
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={2} />
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editId ? 'Update' : 'Book'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete Appointment" message="Are you sure you want to delete this appointment?" />
    </div>
  );
}
