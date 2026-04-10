import { useState, useEffect } from 'react';
import { recordsAPI } from '../services/api';
import { FormField, Table, EmptyState } from '../components/UI';
import { Plus, CheckCircle, Clock, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TreatmentPlanManager({ patientId }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPlanModal, setNewPlanModal] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (patientId) {
      recordsAPI.listTreatmentPlans({ patient: patientId })
        .then(res => setPlans(res.data.results || res.data))
        .catch(() => toast.error('Failed to load plans'))
        .finally(() => setLoading(false));
    }
  }, [patientId]);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!title) return;
    setSaving(true);
    try {
      const res = await recordsAPI.createTreatmentPlan({ patient: patientId, title, description: desc });
      setPlans([res.data, ...plans]);
      setNewPlanModal(false);
      setTitle(''); setDesc('');
      toast.success('Treatment plan created');
    } catch {
      toast.error('Failed to create plan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Active Treatment Plans</h3>
        <button onClick={() => setNewPlanModal(true)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> New Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <EmptyState message="No treatment plans found for this patient" compact />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-gray-900">{plan.title}</h4>
                  <p className="text-xs text-gray-500">{plan.description}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  plan.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                  plan.status === 'PROPOSED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {plan.status}
                </span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-3 h-3" /> {new Date(plan.created_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <CheckCircle className="w-3 h-3" /> {plan.items?.filter(i => i.status === 'COMPLETED').length || 0} / {plan.items?.length || 0} items
                  </span>
                </div>
                <button className="text-blue-600 font-bold text-xs hover:underline">View Details</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Small Inline Modal for New Plan */}
      {newPlanModal && (
        <div className="border rounded-xl p-4 bg-blue-50/50 border-blue-100 space-y-4">
          <h4 className="text-sm font-bold text-blue-900 underline underline-offset-4 decoration-blue-200">Draft New Treatment Plan</h4>
          <form onSubmit={handleCreatePlan} className="space-y-3">
            <input 
              value={title} onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Full Mouth Rehabilitation" 
              className="input-field bg-white text-sm" required 
            />
            <textarea 
              value={desc} onChange={e => setDesc(e.target.value)} 
              placeholder="Describe the overall goals..." 
              className="input-field bg-white text-sm" rows={2} 
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setNewPlanModal(false)} className="text-xs text-gray-500 py-1 hover:text-gray-700">Cancel</button>
              <button type="submit" disabled={saving} className="bg-blue-600 text-white rounded-lg px-3 py-1 text-xs font-bold hover:bg-blue-700 flex items-center gap-1">
                {saving && <Loader2 className="w-3 h-3 animate-spin" />} Create Plan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
