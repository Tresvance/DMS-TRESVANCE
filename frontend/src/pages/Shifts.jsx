import { useState, useEffect, useCallback } from 'react';
import { shiftsAPI, usersAPI, leavesAPI } from '../services/api';
import { PageHeader, Table, Spinner, EmptyState, ConfirmDialog, Modal, FormField } from '../components/UI';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, Loader2, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DAYS = [
  { value: 'MON', label: 'Monday'    },
  { value: 'TUE', label: 'Tuesday'   },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday'  },
  { value: 'FRI', label: 'Friday'    },
  { value: 'SAT', label: 'Saturday'  },
  { value: 'SUN', label: 'Sunday'    },
];

export default function Shifts() {
  const [activeTab, setActiveTab] = useState('shifts'); // 'shifts' or 'leaves'

  // Common
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // Shifts State
  const [shifts, setShifts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const SHIFT_INITIAL = {
    user: '',
    day_of_week: 'MON',
    start_time: '09:00',
    end_time: '17:00',
    is_active: true,
  };
  const [form, setForm] = useState(SHIFT_INITIAL);

  // Leaves State
  const [leaves, setLeaves] = useState([]);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [leaveEditId, setLeaveEditId] = useState(null);
  const [leaveDeleteTarget, setLeaveDeleteTarget] = useState(null);
  
  const LEAVE_INITIAL = {
    user: '',
    start_date: '',
    end_date: '',
    reason: '',
    status: 'APPROVED'
  };
  const [leaveForm, setLeaveForm] = useState(LEAVE_INITIAL);

  const formatTime12h = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours);
    const m = minutes.substring(0, 2);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // 0 becomes 12
    return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, uRes, lRes] = await Promise.all([
        shiftsAPI.list(),
        usersAPI.list({ limit: 100 }),
        leavesAPI.list()
      ]);
      
      setShifts(sRes.data.results || sRes.data || []);
      setLeaves(lRes.data.results || lRes.data || []);
      
      const usersData = uRes.data.results || uRes.data || [];
      const staffList = usersData.filter(u => 
        ['DENTIST', 'HYGIENIST', 'RECEPTION'].includes(u.role)
      );
      setStaff(staffList);
    } catch (err) { 
      console.error('Error loading data:', err);
      toast.error('Failed to load data. Please refresh.'); 
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // SHIFTS LOGIC
  const fc = (f) => (e) => setForm(v => ({ ...v, [f]: e.target.value }));
  const openAdd = () => { setForm(SHIFT_INITIAL); setEditId(null); setModalOpen(true); };
  const openEdit = (s) => {
    setForm({
      user: s.user,
      day_of_week: s.day_of_week,
      start_time: s.start_time.substring(0, 5),
      end_time: s.end_time.substring(0, 5),
      is_active: s.is_active,
    });
    setEditId(s.id);
    setModalOpen(true);
  };
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.user || !form.start_time || !form.end_time) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      if (editId) await shiftsAPI.update(editId, form);
      else await shiftsAPI.create(form);
      toast.success(editId ? 'Shift updated' : 'Shift created');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.non_field_errors?.[0] || 'Failed to save shift');
    } finally { setSaving(false); }
  };
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await shiftsAPI.delete(deleteTarget.id);
      toast.success('Shift deleted');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Failed to delete shift'); }
    finally { setDeleting(false); }
  };

  // LEAVES LOGIC
  const fl = (f) => (e) => setLeaveForm(v => ({ ...v, [f]: e.target.value }));
  const openAddLeave = () => { setLeaveForm(LEAVE_INITIAL); setLeaveEditId(null); setLeaveModalOpen(true); };
  const openEditLeave = (l) => {
    setLeaveForm({
      user: l.user,
      start_date: l.start_date,
      end_date: l.end_date,
      reason: l.reason || '',
      status: l.status,
    });
    setLeaveEditId(l.id);
    setLeaveModalOpen(true);
  };
  const handleSaveLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.user || !leaveForm.start_date || !leaveForm.end_date) {
      toast.error('Please fill all required fields');
      return;
    }
    setLeaveSaving(true);
    try {
      if (leaveEditId) await leavesAPI.update(leaveEditId, leaveForm);
      else await leavesAPI.create(leaveForm);
      toast.success(leaveEditId ? 'Leave updated' : 'Leave added');
      setLeaveModalOpen(false);
      load();
    } catch (err) {
      toast.error('Failed to save leave');
    } finally { setLeaveSaving(false); }
  };
  const handleDeleteLeave = async () => {
    setDeleting(true);
    try {
      await leavesAPI.delete(leaveDeleteTarget.id);
      toast.success('Leave deleted');
      setLeaveDeleteTarget(null);
      load();
    } catch { toast.error('Failed to delete leave'); }
    finally { setDeleting(false); }
  };


  return (
    <div className="space-y-6">
      <PageHeader 
        title="Staff Shifts & Leaves" 
        subtitle="Manage working hours and time-off for your clinic staff"
        action={
          activeTab === 'shifts' ? (
            <button onClick={openAdd} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Shift
            </button>
          ) : (
            <button onClick={openAddLeave} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Leave
            </button>
          )
        }
      />

      <div className="flex space-x-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('shifts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'shifts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" /> Regular Shifts
          </div>
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'leaves' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" /> Vacations & Leaves
          </div>
        </button>
      </div>

      <div className="card mt-4">
        {loading ? <Spinner /> : activeTab === 'shifts' ? (
          shifts.length === 0 ? (
            <EmptyState 
              message="No shifts assigned yet" 
              icon={Clock} 
              description="Start by assigning shifts to your staff members."
            />
          ) : (
            <Table headers={['Staff Member', 'Role', 'Day', 'Time Slot', 'Status', 'Actions']}>
              {shifts.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {s.user_details?.full_name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium">{s.user_details?.full_name}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${
                      s.user_details?.role === 'DENTIST' ? 'bg-green-100 text-green-700' :
                      s.user_details?.role === 'HYGIENIST' ? 'bg-teal-100 text-teal-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {s.user_details?.role?.toLowerCase()}
                    </span>
                  </td>
                  <td className="table-cell">{s.day_display}</td>
                  <td className="table-cell font-mono text-sm">
                    {formatTime12h(s.start_time)} - {formatTime12h(s.end_time)}
                  </td>
                  <td className="table-cell">
                    {s.is_active ? 
                      <span className="badge-green">Active</span> : 
                      <span className="badge-gray">Inactive</span>
                    }
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(s)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )
        ) : (
          leaves.length === 0 ? (
            <EmptyState 
              message="No leaves registered" 
              icon={AlertCircle} 
              description="Register time off and vacations for staff members."
            />
          ) : (
            <Table headers={['Staff Member', 'Date Range', 'Reason', 'Status', 'Actions']}>
              {leaves.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {l.user_details?.full_name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium">{l.user_details?.full_name}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm">
                      {new Date(l.start_date).toLocaleDateString()} to {new Date(l.end_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="table-cell text-sm text-gray-600 truncate max-w-[200px]">{l.reason}</td>
                  <td className="table-cell">
                    <span className={`badge ${
                      l.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      l.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => openEditLeave(l)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setLeaveDeleteTarget(l)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )
        )}
      </div>

      {/* SHIFT MODAL */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editId ? 'Edit Shift' : 'Add New Shift'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Staff Member" required>
            <select value={form.user} onChange={fc('user')} className="input-field" disabled={!!editId}>
              <option value="">Select staff member</option>
              {staff.map(u => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role.toLowerCase()})
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Day of Week" required>
              <select value={form.day_of_week} onChange={fc('day_of_week')} className="input-field">
                {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </FormField>
            
            <FormField label="Status">
              <select 
                value={form.is_active ? 'true' : 'false'} 
                onChange={(e) => setForm(v => ({...v, is_active: e.target.value === 'true'}))}
                className="input-field"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Time" required>
              <input type="time" value={form.start_time} onChange={fc('start_time')} className="input-field" />
            </FormField>
            <FormField label="End Time" required>
              <input type="time" value={form.end_time} onChange={fc('end_time')} className="input-field" />
            </FormField>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editId ? 'Update Shift' : 'Create Shift'}
            </button>
          </div>
        </form>
      </Modal>

      {/* LEAVE MODAL */}
      <Modal 
        isOpen={leaveModalOpen} 
        onClose={() => setLeaveModalOpen(false)} 
        title={leaveEditId ? 'Edit Leave' : 'Add New Leave'}
      >
        <form onSubmit={handleSaveLeave} className="space-y-4">
          <FormField label="Staff Member" required>
            <select value={leaveForm.user} onChange={fl('user')} className="input-field" disabled={!!leaveEditId}>
              <option value="">Select staff member</option>
              {staff.map(u => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role.toLowerCase()})
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date" required>
              <input type="date" value={leaveForm.start_date} onChange={fl('start_date')} className="input-field" />
            </FormField>
            <FormField label="End Date" required>
              <input type="date" value={leaveForm.end_date} onChange={fl('end_date')} className="input-field" />
            </FormField>
          </div>

          <FormField label="Status">
            <select value={leaveForm.status} onChange={fl('status')} className="input-field">
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </FormField>

          <FormField label="Reason (Optional)">
            <textarea value={leaveForm.reason} onChange={fl('reason')} className="input-field" rows="2" placeholder="e.g. Vacation, Sick leave..."></textarea>
          </FormField>

          <div className="flex gap-3 justify-end pt-4">
            <button type="button" onClick={() => setLeaveModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={leaveSaving} className="btn-primary flex items-center gap-2">
              {leaveSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {leaveEditId ? 'Update Leave' : 'Create Leave'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE (Shared logic or separate) */}
      <ConfirmDialog 
        isOpen={!!deleteTarget} 
        onClose={() => setDeleteTarget(null)} 
        onConfirm={handleDelete} 
        loading={deleting}
        title="Delete Shift" 
        message="Are you sure you want to delete this shift? This action cannot be undone."
      />

      <ConfirmDialog 
        isOpen={!!leaveDeleteTarget} 
        onClose={() => setLeaveDeleteTarget(null)} 
        onConfirm={handleDeleteLeave} 
        loading={deleting}
        title="Delete Leave" 
        message="Are you sure you want to delete this leave record? This action cannot be undone."
      />
    </div>
  );
}
