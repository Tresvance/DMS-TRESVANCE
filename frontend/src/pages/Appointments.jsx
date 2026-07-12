import { useState, useEffect, useCallback, useMemo } from 'react';
import { appointmentsAPI, patientsAPI, usersAPI, treatmentTypesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  PageHeader, Table, Spinner, EmptyState, ConfirmDialog,
  StatusBadge, Modal, FormField, SearchBar
} from '../components/UI';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, Loader2, Star, AlertCircle, List } from 'lucide-react';
import toast from 'react-hot-toast';

import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

const INITIAL_FORM = {
  patient: '', doctor: '', treatment_type: '', appointment_date: '', 
  appointment_time: '09:00', end_time: '09:30',
  reason: '', status: 'Scheduled', notes: '',
  recurrence_type: 'none', recurrence_count: 1
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
  const [treatmentTypes, setTreatmentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [viewMode, setViewMode] = useState('calendar'); // list or calendar
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const canEdit = ['SUPER_ADMIN', 'ADMIN', 'RECEPTION'].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, patRes, docRes, typeRes] = await Promise.all([
        appointmentsAPI.list({ search }),
        patientsAPI.list({ page_size: 200 }),
        usersAPI.list({ role: 'DENTIST' }),
        treatmentTypesAPI.list()
      ]);
      setAppointments(apptRes.data.results || apptRes.data);
      setPatients(patRes.data.results || patRes.data);
      setDoctors(docRes.data.results || docRes.data);
      setTreatmentTypes(typeRes.data.results || typeRes.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = (start = null, end = null) => { 
    let defaultTime = '09:00';
    let defaultDate = '';
    let endTime = '09:30';
    if (start) {
      defaultDate = moment(start).format('YYYY-MM-DD');
      defaultTime = moment(start).format('HH:mm');
      endTime = moment(end || start).format('HH:mm');
    }
    setForm({ ...INITIAL_FORM, appointment_date: defaultDate, appointment_time: defaultTime, end_time: endTime }); 
    setEditId(null); 
    setModalOpen(true); 
  };

  const openEdit = (a) => {
    setForm({
      patient: a.patient, doctor: a.doctor, treatment_type: a.treatment_type || '', 
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time?.slice(0, 5) || '09:00', 
      end_time: a.end_time?.slice(0, 5) || '09:30',
      reason: a.reason,
      status: a.status, notes: a.notes || '',
      recurrence_type: 'none', recurrence_count: 1
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
      const payload = { ...form };
      if (!editId && form.recurrence_type !== 'none') {
        payload.recurrence = { type: form.recurrence_type, count: form.recurrence_count };
      }
      if (editId) { await appointmentsAPI.update(editId, payload); toast.success('Appointment updated'); }
      else { await appointmentsAPI.create(payload); toast.success('Appointment booked'); }
      setModalOpen(false); load();
    } catch (err) {
      toast.error(err.response?.data?.detail || (err.response?.data && Object.values(err.response.data)[0]) || 'Save failed');
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

  const handleTreatmentTypeChange = (e) => {
    const ttId = e.target.value;
    setForm(f => {
      const newForm = { ...f, treatment_type: ttId };
      const tt = treatmentTypes.find(t => t.id == ttId);
      if (tt && f.appointment_time) {
        // auto update end_time
        const startMoment = moment(`2000-01-01 ${f.appointment_time}`);
        startMoment.add(tt.duration_minutes, 'minutes');
        newForm.end_time = startMoment.format('HH:mm');
      }
      return newForm;
    });
  };

  // Calendar Event Format
  const events = appointments.map(a => {
    const startStr = `${a.appointment_date}T${a.appointment_time}`;
    const endStr = a.end_time ? `${a.appointment_date}T${a.end_time}` : moment(startStr).add(30, 'minutes').format();
    const isPast = moment(startStr).isBefore(moment());
    
    let color = '#3B82F6'; // default blue
    if (a.treatment_type_details?.color_code) color = a.treatment_type_details.color_code;
    
    if (a.status === 'Cancelled') color = '#EF4444';
    if (a.status === 'No Show') color = '#6B7280';
    if (a.status === 'Completed') color = '#10B981';
    
    return {
      id: a.id,
      title: `${a.patient_name} - ${a.reason}`,
      start: new Date(startStr),
      end: new Date(endStr),
      resource: a,
      color: color,
      opacity: isPast ? 0.6 : 1
    };
  });

  const onEventDrop = async ({ event, start, end }) => {
    if (!canEdit) return;
    const a = event.resource;
    const payload = {
      ...a,
      appointment_date: moment(start).format('YYYY-MM-DD'),
      appointment_time: moment(start).format('HH:mm'),
      end_time: moment(end).format('HH:mm')
    };
    try {
      await appointmentsAPI.update(a.id, payload);
      toast.success('Appointment rescheduled');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Conflict or error during reschedule');
      load(); // revert
    }
  };

  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: event.color,
        opacity: event.opacity,
        borderRadius: '6px',
        border: 'none',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '11px',
        textShadow: '0px 1px 2px rgba(0,0,0,0.2)'
      }
    };
  };

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle={`${appointments.length} scheduled total`}
        action={
          <div className="flex gap-2">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
                <CalendarIcon className="w-4 h-4" />
              </button>
            </div>
            {canEdit && (
              <button onClick={() => openAdd()} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Book
              </button>
            )}
          </div>
        }
      />

      <div className="card h-[75vh] flex flex-col">
        {viewMode === 'list' && (
          <div className="mb-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search patient, doctor..." />
          </div>
        )}

        {loading && appointments.length === 0 ? <Spinner /> : viewMode === 'list' ? (
          appointments.length === 0 ? (
            <EmptyState message="No appointments found" icon={CalendarIcon} />
          ) : (
            <div className="flex-1 overflow-auto">
              <Table headers={['Patient', 'DENTIST', 'Date', 'Time', 'Reason', 'Status', ...(canEdit ? ['Actions'] : [])]}>
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
                      </div>
                    </td>
                    <td className="table-cell">{a.doctor_name}</td>
                    <td className="table-cell">{new Date(a.appointment_date).toLocaleDateString()}</td>
                    <td className="table-cell font-semibold text-blue-600">{formatTime12h(a.appointment_time)} - {formatTime12h(a.end_time)}</td>
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
            </div>
          )
        ) : (
          <div className="flex-1">
            <DnDCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              onEventDrop={onEventDrop}
              onEventResize={onEventDrop} // Uses same logic for resize
              resizable
              selectable={canEdit}
              onSelectSlot={({ start, end }) => openAdd(start, end)}
              onSelectEvent={(event) => openEdit(event.resource)}
              eventPropGetter={eventStyleGetter}
              defaultView="week"
              views={['month', 'week', 'day']}
              step={15}
              timeslots={2}
            />
          </div>
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
            <FormField label="DENTIST" required>
              <select name="doctor" value={form.doctor} onChange={e => setForm(f => ({ ...f, doctor: e.target.value }))} className="input-field">
                <option value="">Select doctor</option>
                {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
              </select>
            </FormField>
            <FormField label="Treatment Type">
              <select name="treatment_type" value={form.treatment_type} onChange={handleTreatmentTypeChange} className="input-field">
                <option value="">General (No specific duration)</option>
                {treatmentTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.duration_minutes}m)</option>)}
              </select>
            </FormField>
            <FormField label="Reason" required>
              <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="input-field" placeholder="Reason for visit" />
            </FormField>
            <FormField label="Date" required>
              <input type="date" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} className="input-field" />
            </FormField>
            <FormField label="Start Time" required>
              <TimePicker value={form.appointment_time} onChange={val => setForm(f => ({ ...f, appointment_time: val }))} />
            </FormField>
            <FormField label="End Time" required>
              <TimePicker value={form.end_time} onChange={val => setForm(f => ({ ...f, end_time: val }))} />
            </FormField>
            
            <FormField label="Status">
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field">
                <option value="Scheduled">Scheduled</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Checked-In">Checked-In</option>
                <option value="In-Progress">In-Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="No Show">No Show</option>
              </select>
            </FormField>
          </div>

          {!editId && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg grid grid-cols-2 gap-4">
              <FormField label="Recurrence">
                <select value={form.recurrence_type} onChange={e => setForm(f => ({ ...f, recurrence_type: e.target.value }))} className="input-field">
                  <option value="none">None</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </FormField>
              {form.recurrence_type !== 'none' && (
                <FormField label="Occurrences">
                  <input type="number" min="1" max="12" value={form.recurrence_count} onChange={e => setForm(f => ({ ...f, recurrence_count: e.target.value }))} className="input-field" />
                </FormField>
              )}
            </div>
          )}

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
