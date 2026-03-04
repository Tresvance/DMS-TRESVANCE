import { useState, useEffect, useCallback } from 'react';
import { billingAPI, patientsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Table, Spinner, EmptyState, ConfirmDialog, StatusBadge, Modal, FormField, SearchBar } from '../components/UI';
import { Plus, Edit2, Trash2, CreditCard, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const INITIAL = { patient: '', total_amount: '', paid_amount: '', payment_method: 'Cash', invoice_date: format(new Date(), 'yyyy-MM-dd'), notes: '' };

export default function Billing() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const canEdit = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTION'].includes(user?.role);
  const fc = (f) => (e) => setForm(v => ({ ...v, [f]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([billingAPI.list({ search }), patientsAPI.list({ page_size: 200 })]);
      setBills(bRes.data.results || bRes.data);
      setPatients(pRes.data.results || pRes.data);
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (b) => {
    setForm({ patient: b.patient, total_amount: b.total_amount, paid_amount: b.paid_amount, payment_method: b.payment_method, invoice_date: b.invoice_date, notes: b.notes || '' });
    setEditId(b.id); setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.patient || !form.total_amount) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      if (editId) await billingAPI.update(editId, form); else await billingAPI.create(form);
      toast.success(editId ? 'Invoice updated' : 'Invoice created'); setModalOpen(false); load();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await billingAPI.delete(deleteTarget.id); toast.success('Deleted'); setDeleteTarget(null); load(); }
    catch { toast.error('Delete failed'); } finally { setDeleting(false); }
  };

  const totalRevenue = bills.filter(b => b.status === 'Paid').reduce((s, b) => s + Number(b.paid_amount), 0);
  const totalPending = bills.filter(b => b.status !== 'Paid').reduce((s, b) => s + Number(b.balance), 0);

  return (
    <div>
      <PageHeader title="Billing & Invoices" subtitle={`${bills.length} invoices`}
        action={canEdit && <button onClick={() => { setForm(INITIAL); setEditId(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Invoice</button>}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center"><CreditCard className="w-5 h-5 text-green-600" /></div>
          <div><div className="text-xl font-bold">₹{totalRevenue.toLocaleString()}</div><div className="text-xs text-gray-500">Total Collected</div></div>
        </div>
        <div className="stat-card">
          <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center"><CreditCard className="w-5 h-5 text-orange-600" /></div>
          <div><div className="text-xl font-bold">₹{totalPending.toLocaleString()}</div><div className="text-xs text-gray-500">Pending Balance</div></div>
        </div>
        <div className="stat-card">
          <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center"><CreditCard className="w-5 h-5 text-blue-600" /></div>
          <div><div className="text-xl font-bold">{bills.length}</div><div className="text-xs text-gray-500">Total Invoices</div></div>
        </div>
      </div>

      <div className="card">
        <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Search invoice, patient..." /></div>
        {loading ? <Spinner /> : bills.length === 0 ? <EmptyState message="No invoices found" icon={CreditCard} /> : (
          <Table headers={['Invoice #', 'Patient', 'Total', 'Paid', 'Balance', 'Method', 'Date', 'Status', ...(canEdit ? ['Actions'] : [])]}>
            {bills.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="table-cell font-mono text-xs text-blue-600 font-medium">{b.invoice_number}</td>
                <td className="table-cell font-medium">{b.patient_name}</td>
                <td className="table-cell font-medium">₹{Number(b.total_amount).toLocaleString()}</td>
                <td className="table-cell text-green-600">₹{Number(b.paid_amount).toLocaleString()}</td>
                <td className="table-cell text-orange-600">₹{Number(b.balance).toLocaleString()}</td>
                <td className="table-cell">{b.payment_method}</td>
                <td className="table-cell text-gray-500 text-xs">{new Date(b.invoice_date).toLocaleDateString()}</td>
                <td className="table-cell"><StatusBadge status={b.status} /></td>
                {canEdit && (
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(b)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget(b)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </Table>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Invoice' : 'New Invoice'}>
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Patient" required>
            <select value={form.patient} onChange={fc('patient')} className="input-field">
              <option value="">Select patient</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Total Amount (₹)" required><input type="number" min="0" step="0.01" value={form.total_amount} onChange={fc('total_amount')} className="input-field" /></FormField>
            <FormField label="Paid Amount (₹)"><input type="number" min="0" step="0.01" value={form.paid_amount} onChange={fc('paid_amount')} className="input-field" /></FormField>
            <FormField label="Payment Method">
              <select value={form.payment_method} onChange={fc('payment_method')} className="input-field">
                {['Cash','Card','UPI','Bank Transfer','Insurance'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
            <FormField label="Invoice Date"><input type="date" value={form.invoice_date} onChange={fc('invoice_date')} className="input-field" /></FormField>
          </div>
          <FormField label="Notes"><textarea value={form.notes} onChange={fc('notes')} className="input-field" rows={2} /></FormField>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete Invoice" message={`Delete invoice ${deleteTarget?.invoice_number}?`} />
    </div>
  );
}
