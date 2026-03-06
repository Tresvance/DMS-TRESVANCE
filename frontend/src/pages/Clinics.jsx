import { useState, useEffect, useCallback } from 'react';
import { clinicsAPI, paymentsAPI } from '../services/api';
import { PageHeader, Table, Spinner, EmptyState, ConfirmDialog, Modal, FormField, SearchBar } from '../components/UI';
import { Plus, Edit2, Trash2, Building2, Loader2, Globe, Copy, Check, Eye, CreditCard, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL = {
  clinic_name: '', clinic_code: '', registration_number: '',
  address: '', phone: '', email: '',
  subscription_amount: '', is_trial: true, trial_days: 30
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
  const [viewTarget,   setViewTarget]   = useState(null);
  // Payment modal state
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentClinic, setPaymentClinic] = useState(null);
  const [paymentMonths, setPaymentMonths] = useState(1);
  const [processingPayment, setProcessingPayment] = useState(false);

  const fc = (f) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
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
      subscription_amount: c.subscription_amount || '',
      is_trial:            c.is_trial ?? true,
      trial_days:          c.trial_days || 30,
    });
    setEditId(c.id);
    setModalOpen(true);
  };

  // Open payment modal for a clinic
  const openPayment = (c) => {
    setPaymentClinic(c);
    setPaymentMonths(1);
    setPaymentModal(true);
  };

  // Initialize Razorpay payment
  const handlePayment = async () => {
    if (!paymentClinic) return;
    setProcessingPayment(true);

    try {
      // Create order on backend
      const { data: orderData } = await paymentsAPI.createOrder({
        clinic_id: paymentClinic.id,
        months: paymentMonths,
      });

      // Initialize Razorpay
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'DMS Tresvance',
        description: `Subscription for ${paymentClinic.clinic_name} (${paymentMonths} month${paymentMonths > 1 ? 's' : ''})`,
        order_id: orderData.order_id,
        handler: async (response) => {
          // Verify payment
          try {
            const verifyRes = await paymentsAPI.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success('Payment successful! Subscription activated.');
            setPaymentModal(false);
            load();
          } catch (err) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: paymentClinic.clinic_name,
          email: paymentClinic.email,
          contact: paymentClinic.phone,
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: () => {
            setProcessingPayment(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initiate payment');
    } finally {
      setProcessingPayment(false);
    }
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
          <Table headers={['Clinic Name', 'Subdomain', 'Subscription', 'Days Left', 'Status', 'Actions']}>
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

                {/* Subscription Status */}
                <td className="table-cell">
                  {c.subscription_status === 'TRIAL' && (
                    <span className="badge-yellow flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Trial
                    </span>
                  )}
                  {c.subscription_status === 'ACTIVE' && (
                    <span className="badge-green flex items-center gap-1">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  )}
                  {c.subscription_status === 'PENDING' && (
                    <span className="badge-orange flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Pending
                    </span>
                  )}
                  {c.subscription_status === 'EXPIRED' && (
                    <span className="badge-red flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Expired
                    </span>
                  )}
                  {c.subscription_amount > 0 && (
                    <span className="text-xs text-gray-500 block mt-0.5">₹{c.subscription_amount}/mo</span>
                  )}
                </td>

                {/* Days Remaining */}
                <td className="table-cell">
                  <span className={`font-medium ${c.days_remaining <= 7 ? 'text-red-600' : c.days_remaining <= 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {c.days_remaining} days
                  </span>
                </td>

                <td className="table-cell">
                  {c.is_active
                    ? <span className="badge-green">Active</span>
                    : <span className="badge-gray">Inactive</span>}
                </td>
                <td className="table-cell">
                  <div className="flex gap-2">
                    {/* Pay button - show for non-trial or when subscription amount is set */}
                    {c.subscription_amount > 0 && !c.is_trial && (
                      <button
                        onClick={() => openPayment(c)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Make Payment"
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
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

          {/* Subscription Settings */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Subscription Settings
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Monthly Amount (₹)" hint="Set to 0 for free accounts">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.subscription_amount}
                  onChange={fc('subscription_amount')}
                  className="input-field"
                  placeholder="e.g. 999"
                />
              </FormField>

              <FormField label="Trial Days" hint="Number of days for trial period">
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={form.trial_days}
                  onChange={fc('trial_days')}
                  className="input-field"
                  disabled={!form.is_trial}
                />
              </FormField>
            </div>

            <div className="mt-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_trial}
                  onChange={fc('is_trial')}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Enable Trial Period</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-7">
                {form.is_trial 
                  ? `Clinic will have ${form.trial_days || 30} days free trial before payment is required.`
                  : 'Trial is disabled. Clinic needs to pay immediately based on subscription amount.'
                }
              </p>
            </div>
          </div>

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

      {/* View Details Modal */}
      <Modal isOpen={!!viewTarget} onClose={() => setViewTarget(null)} title="Clinic Details">
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{viewTarget.clinic_name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{viewTarget.subdomain}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Clinic Code</p>
                <p className="text-sm text-gray-900 font-mono">{viewTarget.clinic_code}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Registration Number</p>
                <p className="text-sm text-gray-900 font-mono">{viewTarget.registration_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Phone</p>
                <p className="text-sm text-gray-900">{viewTarget.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Email</p>
                <p className="text-sm text-blue-600">{viewTarget.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Staff Count</p>
                <p className="text-sm text-gray-900">{viewTarget.staff_count ?? '—'} staff</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Status</p>
                {viewTarget.is_active
                  ? <span className="badge-green">Active</span>
                  : <span className="badge-gray">Inactive</span>}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Address</p>
              <p className="text-sm text-gray-900">{viewTarget.address || '—'}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setViewTarget(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Clinic"
        message={`Delete "${deleteTarget?.clinic_name}" (${deleteTarget?.subdomain})? All associated data will be affected.`}
      />

      {/* Payment Modal */}
      <Modal isOpen={paymentModal} onClose={() => setPaymentModal(false)} title="Make Payment">
        {paymentClinic && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900">{paymentClinic.clinic_name}</h3>
              <p className="text-sm text-gray-500">{paymentClinic.subdomain}</p>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Rate:</span>
                <span className="font-medium">₹{paymentClinic.subscription_amount}</span>
              </div>

              <FormField label="Number of Months">
                <select
                  value={paymentMonths}
                  onChange={(e) => setPaymentMonths(parseInt(e.target.value))}
                  className="input-field"
                >
                  {[1, 2, 3, 6, 12].map(m => (
                    <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </FormField>

              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-600">
                  ₹{(parseFloat(paymentClinic.subscription_amount) * paymentMonths).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setPaymentModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={processingPayment}
                className="btn-primary flex items-center gap-2"
              >
                {processingPayment && <Loader2 className="w-4 h-4 animate-spin" />}
                <CreditCard className="w-4 h-4" />
                Pay Now
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
