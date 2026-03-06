import { useState, useEffect, useCallback } from 'react';
import { billingAPI, patientsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Table, Spinner, EmptyState, ConfirmDialog, StatusBadge, Modal, FormField, SearchBar } from '../components/UI';
import { Plus, Edit2, Trash2, CreditCard, Loader2, X, Eye, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const EMPTY_ITEM = { description: '', quantity: 1, unit_price: '' };
const INITIAL = { patient: '', paid_amount: '', payment_method: 'Cash', invoice_date: format(new Date(), 'yyyy-MM-dd'), notes: '', items: [{ ...EMPTY_ITEM }] };

// ── PDF Generation ──────────────────────────────────────────────────
const generateInvoicePDF = (bill) => {
  const balance = Number(bill.balance);
  const statusColor = bill.status === 'Paid' ? '#16a34a' : '#ea580c';

  const itemRows = (bill.items && bill.items.length > 0)
    ? bill.items.map((item, i) => `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9fafb'}">
          <td style="padding:10px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb">${item.description}</td>
          <td style="padding:10px 14px;font-size:13px;color:#374151;text-align:center;border-bottom:1px solid #e5e7eb">${item.quantity}</td>
          <td style="padding:10px 14px;font-size:13px;color:#374151;text-align:right;border-bottom:1px solid #e5e7eb">&#8377;${Number(item.unit_price).toLocaleString()}</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #e5e7eb">&#8377;${Number(item.amount || (item.quantity * item.unit_price)).toLocaleString()}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" style="padding:16px;text-align:center;color:#9ca3af;font-size:13px">No line items</td></tr>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${bill.invoice_number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#111827; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body style="padding:48px;max-width:760px;margin:0 auto">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px">
    <div>
      <div style="font-size:24px;font-weight:800;color:#1e40af;margin-bottom:4px">${bill.clinic_name}</div>
      <div style="font-size:12px;color:#4b5563;line-height:1.4">
        ${bill.clinic_address}<br/>
        Phone: ${bill.clinic_phone} | Email: ${bill.clinic_email}<br/>
        Reg No: ${bill.clinic_registration_number}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:20px;font-weight:800;color:#1e40af;letter-spacing:1px">INVOICE</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px;font-weight:600">${bill.invoice_number}</div>
      <div style="display:inline-block;background:${statusColor};color:#fff;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;margin-top:8px;text-transform:uppercase">${bill.status}</div>
    </div>
  </div>

  <div style="height:1px;background:#e5e7eb;margin-bottom:25px"></div>

  <div style="display:flex;justify-content:space-between;margin-bottom:30px">
    <div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#9ca3af;margin-bottom:4px">Bill To</div>
      <div style="font-size:16px;font-weight:700;color:#111827">${bill.patient_name}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#9ca3af;margin-bottom:4px">Date</div>
      <div style="font-size:14px;font-weight:600;color:#111827">${new Date(bill.invoice_date).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}</div>
    </div>
  </div>

  <!-- Line Items Table -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px">
    <thead>
      <tr style="background:#1e40af">
        <th style="padding:12px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#fff;text-align:left">Description</th>
        <th style="padding:12px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#fff;text-align:center">Qty</th>
        <th style="padding:12px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#fff;text-align:right">Unit Price</th>
        <th style="padding:12px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#fff;text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- Totals -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:32px">
    <div style="width:280px">
      <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb">
        <span style="font-size:13px;color:#6b7280">Subtotal</span>
        <span style="font-size:13px;font-weight:600;color:#111827">&#8377;${Number(bill.total_amount).toLocaleString()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb">
        <span style="font-size:13px;color:#6b7280">Amount Paid</span>
        <span style="font-size:13px;font-weight:600;color:#16a34a">&#8377;${Number(bill.paid_amount).toLocaleString()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:12px 14px;background:${balance > 0 ? '#fff7ed' : '#f0fdf4'};border-radius:8px;margin-top:8px">
        <span style="font-size:14px;font-weight:700;color:#111827">Balance Due</span>
        <span style="font-size:16px;font-weight:800;color:${balance > 0 ? '#ea580c' : '#16a34a'}">&#8377;${balance.toLocaleString()}</span>
      </div>
    </div>
  </div>

  <!-- Payment Method -->
  <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:14px 18px;margin-bottom:${bill.notes ? '24px' : '0'}">
    <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#9ca3af">Payment Method: </span>
    <span style="font-size:13px;font-weight:600;color:#374151">${bill.payment_method}</span>
  </div>

  ${bill.notes ? `
  <!-- Notes -->
  <div style="margin-top:24px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:6px">Notes</div>
    <p style="font-size:13px;color:#374151;line-height:1.6">${bill.notes}</p>
  </div>` : ''}

  <!-- Footer -->
  <div style="margin-top:48px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center">
    <p style="font-size:12px;color:#9ca3af">Thank you for choosing us. Please retain this invoice for your records.</p>
  </div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=820,height=900');
  if (!win) { toast.error('Pop-up blocked. Please allow pop-ups and try again.'); return; }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 300);
  };
};

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
  const [viewTarget, setViewTarget] = useState(null);
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
    const items = (b.items && b.items.length > 0)
      ? b.items.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price }))
      : [{ ...EMPTY_ITEM }];
    setForm({
      patient: b.patient,
      paid_amount: b.paid_amount,
      payment_method: b.payment_method,
      invoice_date: b.invoice_date,
      notes: b.notes || '',
      items,
    });
    setEditId(b.id);
    setModalOpen(true);
  };

  const updateItem = (index, field, value) => {
    setForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm(prev => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));
  };

  const removeItem = (index) => {
    setForm(prev => {
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: items.length > 0 ? items : [{ ...EMPTY_ITEM }] };
    });
  };

  const itemTotal = (item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return qty * price;
  };

  const grandTotal = form.items.reduce((sum, item) => sum + itemTotal(item), 0);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.patient) { toast.error('Select a patient'); return; }
    const validItems = form.items.filter(i => i.description && Number(i.unit_price) > 0);
    if (validItems.length === 0) { toast.error('Add at least one line item'); return; }
    const payload = {
      patient: form.patient,
      total_amount: grandTotal,
      paid_amount: Number(form.paid_amount) || 0,
      payment_method: form.payment_method,
      invoice_date: form.invoice_date,
      notes: form.notes,
      items: validItems.map(i => ({
        description: i.description,
        quantity: Number(i.quantity) || 1,
        unit_price: Number(i.unit_price),
      })),
    };
    setSaving(true);
    try {
      if (editId) await billingAPI.update(editId, payload); else await billingAPI.create(payload);
      toast.success(editId ? 'Invoice updated' : 'Invoice created');
      setModalOpen(false);
      load();
    } catch (err) {
      const errs = err.response?.data;
      const msg = errs ? (typeof errs === 'string' ? errs : Object.values(errs).flat().join(', ')) : 'Save failed';
      toast.error(msg);
    } finally { setSaving(false); }
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
          <Table headers={['Invoice #', 'Patient', 'Items', 'Total', 'Paid', 'Balance', 'Method', 'Date', 'Status', 'Actions']}>
            {bills.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="table-cell font-mono text-xs text-blue-600 font-medium">{b.invoice_number}</td>
                <td className="table-cell font-medium">{b.patient_name}</td>
                <td className="table-cell">
                  {b.items && b.items.length > 0 ? (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {b.items.length} item{b.items.length !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="table-cell font-medium">₹{Number(b.total_amount).toLocaleString()}</td>
                <td className="table-cell text-green-600">₹{Number(b.paid_amount).toLocaleString()}</td>
                <td className="table-cell text-orange-600">₹{Number(b.balance).toLocaleString()}</td>
                <td className="table-cell">{b.payment_method}</td>
                <td className="table-cell text-gray-500 text-xs">{new Date(b.invoice_date).toLocaleDateString()}</td>
                <td className="table-cell"><StatusBadge status={b.status} /></td>
                <td className="table-cell">
                  <div className="flex gap-2">
                    <button onClick={() => setViewTarget(b)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg" title="View Details"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => generateInvoicePDF(b)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Print Bill"><Printer className="w-4 h-4" /></button>
                    {canEdit && <>
                      <button onClick={() => openEdit(b)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget(b)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* ── Invoice Modal ──────────────────────────────── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Invoice' : 'New Invoice'}>
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Patient" required>
            <select value={form.patient} onChange={fc('patient')} className="input-field">
              <option value="">Select patient</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </FormField>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Line Items</label>
              <button type="button" onClick={addItem}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1"></div>
              </div>

              {form.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-gray-100 items-center">
                  <div className="col-span-5">
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="e.g. Root Canal"
                    />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="1" value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="0" step="0.01" value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium text-gray-700 pr-1">
                    ₹{itemTotal(item).toLocaleString()}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button type="button" onClick={() => removeItem(index)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Remove item">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-12 gap-2 px-3 py-2.5 border-t-2 border-gray-200 bg-gray-50">
                <div className="col-span-9 text-right text-sm font-bold text-gray-700">Total</div>
                <div className="col-span-2 text-right text-sm font-bold text-blue-700">₹{grandTotal.toLocaleString()}</div>
                <div className="col-span-1"></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="Paid Amount (₹)">
              <input type="number" min="0" step="0.01" value={form.paid_amount} onChange={fc('paid_amount')} className="input-field" />
            </FormField>
            <FormField label="Payment Method">
              <select value={form.payment_method} onChange={fc('payment_method')} className="input-field">
                {['Cash','Card','UPI','Bank Transfer','Insurance'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
            <FormField label="Invoice Date">
              <input type="date" value={form.invoice_date} onChange={fc('invoice_date')} className="input-field" />
            </FormField>
          </div>

          <FormField label="Notes"><textarea value={form.notes} onChange={fc('notes')} className="input-field" rows={2} /></FormField>

          {(grandTotal > 0 || Number(form.paid_amount) > 0) && (
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm">
              <span className="text-gray-600">Balance Due</span>
              <span className={`font-bold ${(grandTotal - (Number(form.paid_amount) || 0)) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                ₹{(grandTotal - (Number(form.paid_amount) || 0)).toLocaleString()}
              </span>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Details Modal ──────────────────────────────── */}
      <Modal isOpen={!!viewTarget} onClose={() => setViewTarget(null)} title="Invoice Details">
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="font-mono text-sm text-blue-600 font-bold">{viewTarget.invoice_number}</span>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">{viewTarget.patient_name}</p>
              </div>
              <StatusBadge status={viewTarget.status} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Invoice Date</p>
                <p className="text-sm text-gray-900">{new Date(viewTarget.invoice_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Payment Method</p>
                <p className="text-sm text-gray-900">{viewTarget.payment_method}</p>
              </div>
            </div>

            {viewTarget.items && viewTarget.items.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Line Items</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Unit Price</div>
                    <div className="col-span-3 text-right">Amount</div>
                  </div>
                  {viewTarget.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-gray-100 text-sm">
                      <div className="col-span-5 text-gray-800">{item.description}</div>
                      <div className="col-span-2 text-center text-gray-600">{item.quantity}</div>
                      <div className="col-span-2 text-right text-gray-600">₹{Number(item.unit_price).toLocaleString()}</div>
                      <div className="col-span-3 text-right font-medium text-gray-800">₹{Number(item.amount).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-bold text-gray-900">₹{Number(viewTarget.total_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Paid</span>
                <span className="font-medium text-green-600">₹{Number(viewTarget.paid_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm pt-1.5 border-t border-gray-200">
                <span className="font-semibold text-gray-700">Balance Due</span>
                <span className={`font-bold ${Number(viewTarget.balance) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  ₹{Number(viewTarget.balance).toLocaleString()}
                </span>
              </div>
            </div>

            {viewTarget.notes && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Notes</p>
                <p className="text-sm text-gray-700">{viewTarget.notes}</p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                onClick={() => generateInvoicePDF(viewTarget)}
                className="btn-primary flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
              <button onClick={() => setViewTarget(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Delete Invoice" message={`Delete invoice ${deleteTarget?.invoice_number}?`} />
    </div>
  );
}