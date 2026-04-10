import { useState, useEffect } from 'react';
import { patientsAPI } from '../services/api';
import { Modal, Spinner, FormField } from './UI';
import { ArrowRight, UserCheck, AlertCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MergePatientDialog({ isOpen, onClose, onMerged, primaryPatient }) {
  const [step, setStep] = useState(1); // 1: Select Duplicate, 2: Review
  const [duplicateId, setDuplicateId] = useState('');
  const [duplicatePatient, setDuplicatePatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (isOpen && step === 1) {
      loadPatients();
    }
  }, [isOpen, step]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const { data } = await patientsAPI.list({ page_size: 100 });
      // Exclude primary patient
      setPatients((data.results || data).filter(p => p.id !== primaryPatient?.id && p.is_active));
    } catch { toast.error('Failed to load patients'); }
    finally { setLoading(false); }
  };

  const handleReview = async () => {
    if (!duplicateId) return;
    setLoading(true);
    try {
      const { data } = await patientsAPI.get(duplicateId);
      setDuplicatePatient(data);
      setStep(2);
    } catch { toast.error('Failed to load duplicate details'); }
    finally { setLoading(false); }
  };

  const handleMerge = async () => {
    setMerging(true);
    try {
      await patientsAPI.merge(primaryPatient.id, duplicatePatient.id);
      toast.success('Patients merged successfully');
      onMerged();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  const ComparisonRow = ({ label, primary, duplicate }) => (
    <div className="grid grid-cols-2 gap-4 py-2 border-b border-gray-50 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="flex items-center gap-2">
        <span className={primary ? 'text-gray-900 font-medium' : 'text-gray-400 italic'}>{primary || 'None'}</span>
        {!primary && duplicate && (
          <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> Will fill
          </span>
        )}
      </div>
    </div>
  );

  if (!isOpen || !primaryPatient) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Consolidate Records (Merge)" size="lg">
      <div className="space-y-4">
        {step === 1 ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0" />
              <p className="text-sm text-blue-800">
                You are merging another record **into** <span className="font-bold">{primaryPatient?.full_name}</span>. 
                All medical history and billing will be moved.
              </p>
            </div>
            
            <FormField label="Select duplicate patient record" required>
              <select 
                value={duplicateId} 
                onChange={(e) => setDuplicateId(e.target.value)}
                className="input-field"
              >
                <option value="">Select a patient...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.phone || 'No phone'})</option>
                ))}
              </select>
            </FormField>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button 
                onClick={handleReview} 
                disabled={!duplicateId || loading}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? <Spinner className="w-4 h-4 p-0 shrink-0" /> : <ArrowRight className="w-4 h-4" />}
                Review Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="text-center flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Source Record</p>
                <p className="font-bold text-red-600 line-through">{duplicatePatient?.full_name}</p>
                <p className="text-xs text-gray-500">{duplicatePatient?.patient_id}</p>
              </div>
              <ArrowRight className="w-6 h-6 text-gray-300" />
              <div className="text-center flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Destination Record</p>
                <p className="font-bold text-emerald-600">{primaryPatient?.full_name}</p>
                <p className="text-xs text-gray-500">{primaryPatient?.patient_id}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                This action will deactivate the source record. Data movement is permanent.
              </p>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase">Data Consolidation Preview</div>
              <div className="px-4 py-1">
                <ComparisonRow label="Phone" primary={primaryPatient.phone} duplicate={duplicatePatient.phone} />
                <ComparisonRow label="Email" primary={primaryPatient.email} duplicate={duplicatePatient.email} />
                <ComparisonRow label="Blood Group" primary={primaryPatient.blood_group} duplicate={duplicatePatient.blood_group} />
                <ComparisonRow label="Address" primary={primaryPatient.address} duplicate={duplicatePatient.address} />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <button onClick={() => setStep(1)} className="text-blue-600 text-sm font-medium hover:underline">
                Back to selection
              </button>
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-secondary">Cancel</button>
                <button 
                  onClick={handleMerge} 
                  disabled={merging}
                  className="btn-primary flex items-center gap-2"
                >
                  {merging && <Spinner className="w-4 h-4 p-0" />}
                  Confirm Merge
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
