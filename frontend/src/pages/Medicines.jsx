import { useState, useEffect, useCallback } from 'react';
import { medicinesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Table, Spinner, EmptyState, ConfirmDialog, Modal, FormField, SearchBar } from '../components/UI';
import { Plus, Edit2, Trash2, Pill, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL = { name: '', category: 'Other', stock_quantity: 0, expiry_date: '', price: 0, supplier_name: '' };

export default function Medicines() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const canEdit = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR'].includes(user?.role);
  const fc = (f) => (e) => setForm(v => ({ ...v, [f]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await medicinesAPI.list({ search }); setMedicines(data.results || data); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (m) => {
    setForm({ name: m.name, category: m.category, stock_quantity: m.stock_quantity, expiry_date: m.expiry_date || '', price: m.price, supplier_name: m.supplier_name || '' });
    setEditId(m.id); setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (editId) await medicinesAPI.update(editId, form); else await medicinesAPI.create(form);
      toast.success(editId ? 'Updated' : 'Added'); setModalOpen(false); load();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await medicinesAPI.delete(deleteTarget.id); toast.success('Deleted'); setDeleteTarget(null); load(); }
    catch { toast.error('Delete failed'); } finally { setDeleting(false); }
  };

  const categories = ['Antibiotic', 'Analgesic', 'Antifungal', 'Antiseptic', 'Anesthetic', 'Vitamin', 'Other'];

  return (
    <div>
      <PageHeader title="Medicines & Inventory" subtitle={`${medicines.length} items`}
        action={canEdit && <button onClick={() => { setForm(INITIAL); setEditId(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Medicine</button>}
      />
      <div className="card">
        <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Search medicines..." /></div>
        {loading ? <Spinner /> : medicines.length === 0 ? <EmptyState message="No medicines found" icon={Pill} /> : (
          <Table headers={['Name', 'Category', 'Stock', 'Expiry', 'Price', 'Supplier', 'Status', ...(canEdit ? ['Actions'] : [])]}>
            {medicines.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{m.name}</td>
                <td className="table-cell"><span className="badge-blue">{m.category}</span></td>
                <td className="table-cell">
                  <span className={m.is_low_stock ? 'text-orange-600 font-medium flex items-center gap-1' : ''}>
                    {m.is_low_stock && <AlertTriangle className="w-3.5 h-3.5" />}
                    {m.stock_quantity}
                  </span>
                </td>
                <td className="table-cell">
                  {m.expiry_date ? (
                    <span className={m.is_expired ? 'text-red-600 font-medium' : ''}>
                      {new Date(m.expiry_date).toLocaleDateString()}
                    </span>
                  ) : '—'}
                </td>
                <td className="table-cell">₹{Number(m.price).toLocaleString()}</td>
                <td className="table-cell text-gray-500">{m.supplier_name || '—'}</td>
                <td className="table-cell">
                  {m.is_expired ? <span className="badge-red">Expired</span> :
                   m.is_low_stock ? <span className="badge-yellow">Low Stock</span> :
                   <span className="badge-green">OK</span>}
                </td>
                {canEdit && (
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(m)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget(m)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </Table>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Medicine' : 'Add Medicine'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name" required><input value={form.name} onChange={fc('name')} className="input-field" placeholder="Medicine name" /></FormField>
            <FormField label="Category">
              <select value={form.category} onChange={fc('category')} className="input-field">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Stock Quantity"><input type="number" min="0" value={form.stock_quantity} onChange={fc('stock_quantity')} className="input-field" /></FormField>
            <FormField label="Price (₹)"><input type="number" min="0" step="0.01" value={form.price} onChange={fc('price')} className="input-field" /></FormField>
            <FormField label="Expiry Date"><input type="date" value={form.expiry_date} onChange={fc('expiry_date')} className="input-field" /></FormField>
            <FormField label="Supplier"><input value={form.supplier_name} onChange={fc('supplier_name')} className="input-field" placeholder="Supplier name" /></FormField>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editId ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete Medicine" message={`Delete "${deleteTarget?.name}" from inventory?`} />
    </div>
  );
}
