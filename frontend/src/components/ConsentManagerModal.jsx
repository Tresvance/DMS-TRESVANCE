import { useState, useEffect } from 'react';
import { patientsAPI } from '../services/api';
import { Modal, Spinner, StatusBadge } from './UI';
import { ShieldCheck, ShieldAlert, History, FileSignature, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ConsentManagerModal({ isOpen, onClose, patient }) {
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    consent_type: 'TREATMENT',
    signer_name: '',
    witness_name: '',
    notes: '',
    is_signed: false
  });

  useEffect(() => {
    if (isOpen && patient) loadConsents();
  }, [isOpen, patient]);

  const loadConsents = async () => {
    setLoading(true);
    try {
      const { data } = await patientsAPI.getConsents(patient.id);
      setConsents(data);
    } catch { toast.error('Failed to load consent history'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.is_signed) {
      toast.error('Patient must affirm and sign the digital declaration');
      return;
    }
    setSubmitting(true);
    try {
      await patientsAPI.createConsent(patient.id, {
        ...formData,
        status: 'GRANTED',
        signer_name: formData.signer_name || patient.full_name
      });
      toast.success('Consent recorded successfully');
      setFormData({ consent_type: 'TREATMENT', signer_name: '', witness_name: '', notes: '', is_signed: false });
      loadConsents();
    } catch { toast.error('Failed to save consent'); }
    finally { setSubmitting(false); }
  };

  const getConsentStatus = (type) => {
    const active = consents.find(c => c.consent_type === type && c.status === 'GRANTED');
    return active ? 'GRANTED' : 'NONE';
  };

  if (!patient) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Consent Management - ${patient.full_name}`} size="lg">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* New Consent Form */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-blue-600" />
            Record New Consent
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Consent Type</label>
              <select 
                className="input-field"
                value={formData.consent_type}
                onChange={(e) => setFormData({...formData, consent_type: e.target.value})}
              >
                <option value="TREATMENT">Medical Treatment</option>
                <option value="DATA_PRIVACY">Data Privacy (GDPR/HIPAA)</option>
                <option value="MARKETING">Marketing Communications</option>
                <option value="TELEHEALTH">Telehealth Consent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Signer Name</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder={patient.full_name}
                value={formData.signer_name}
                onChange={(e) => setFormData({...formData, signer_name: e.target.value})}
              />
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-inner">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  checked={formData.is_signed}
                  onChange={(e) => setFormData({...formData, is_signed: e.target.checked})}
                />
                <span className="text-xs text-gray-600 leading-relaxed font-medium">
                  I, the undersigned, hereby authorize DMS-TRESVANCE to perform acts as specified in this 
                  <span className="text-blue-600 font-bold"> {formData.consent_type.replace('_', ' ')} </span> 
                  agreement. I understand my data remains protected and I can revoke this at any time.
                </span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={submitting} 
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {submitting && <Spinner className="w-4 h-4 p-0 shrink-0" />}
              Digitally Sign & Record
            </button>
          </form>
        </div>

        {/* Status and History */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4 text-purple-600" />
            Authorization Status
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {[
              { type: 'TREATMENT', label: 'Treatment' },
              { type: 'DATA_PRIVACY', label: 'Privacy' },
            ].map(c => (
              <div key={c.type} className={`p-3 rounded-xl border flex flex-col items-center gap-2 ${getConsentStatus(c.type) === 'GRANTED' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                {getConsentStatus(c.type) === 'GRANTED' ? 
                  <ShieldCheck className="w-6 h-6 text-emerald-600" /> : 
                  <ShieldAlert className="w-6 h-6 text-red-600" />
                }
                <span className="text-[10px] font-bold uppercase tracking-widest">{c.label}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Type</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="3"><Spinner className="py-4" /></td></tr>
                ) : consents.length === 0 ? (
                  <tr><td colSpan="3" className="px-3 py-6 text-center text-xs text-gray-400">No consent history found</td></tr>
                ) : consents.map(c => (
                  <tr key={c.id}>
                    <td className="px-3 py-2 text-xs font-semibold">{c.type_display}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${c.status === 'GRANTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-500">{new Date(c.signed_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
