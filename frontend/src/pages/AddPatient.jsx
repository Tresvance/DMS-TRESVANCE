import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientsAPI } from '../services/api';
import { FormField, Spinner } from '../components/UI';
import { ArrowLeft, Loader2, Plus, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_FORM = {
  first_name: '', middle_name: '', last_name: '', gender: '', date_of_birth: '',
  marital_status: '', occupation: '',
  phone: '', email: '', preferred_contact_method: 'Phone',
  address: '', city: '', pincode: '',
  blood_group: 'Unknown', allergies: '', medical_history: '',
  has_diabetes: false, has_hypertension: false, has_heart_disease: false, other_conditions: '',
  smoker_status: 'NEVER', alcohol_consumption: 'NONE', is_pregnant: false, pregnancy_due_date: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
  insurance_provider: '', insurance_policy_number: '', insurance_coverage_details: '',
  referring_source: '',
  is_vip: false,
  is_high_risk: false,
  risk_details: '',
};

export default function AddPatient() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (!isEdit) return;
    patientsAPI.get(id).then(({ data }) => {
      setForm(f => ({ ...f, ...data }));
    }).catch(() => toast.error('Failed to load patient'))
      .finally(() => setFetching(false));
  }, [id, isEdit]);

  const handleChange = (e) => setForm(f => ({ 
    ...f, 
    [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value 
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.gender || !form.date_of_birth || !form.phone) {
      toast.error('Please fill required fields in Basic Info'); return;
    }
    setLoading(true);
    
    // Clean payload
    const payload = { ...form };
    if (!payload.pregnancy_due_date) {
      payload.pregnancy_due_date = null; // Fix validation error for empty dates
    }
    if (payload.gender === 'Male' || payload.gender === 'Other') {
      payload.is_pregnant = false;
      payload.pregnancy_due_date = null;
    }

    try {
      if (isEdit) {
        await patientsAPI.update(id, payload);
        toast.success('Patient updated!');
      } else {
        const { data } = await patientsAPI.create(payload);
        toast.success('Patient registered!');
        navigate(`/patients/${data.id}/edit`); // Redirect to edit mode so they can add clinical lists
        return;
      }
      navigate('/patients');
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Save failed';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  if (fetching) return <Spinner />;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/patients')} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Patient Profile' : 'Register New Patient'}</h1>
            <p className="text-sm text-gray-500">Fill in the patient details below</p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button onClick={() => setActiveTab('basic')} className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'basic' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Basic Info
        </button>
        <button onClick={() => setActiveTab('medical')} className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'medical' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Medical History Questionnaire
        </button>
        <button onClick={() => setActiveTab('lists')} className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'lists' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`} disabled={!isEdit}>
          Clinical Lists {isEdit ? '' : '(Save basic info first)'}
        </button>
      </div>

      <div className={activeTab !== 'lists' ? 'block' : 'hidden'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={activeTab === 'basic' ? 'block space-y-6' : 'hidden'}>
            {/* Personal Info */}
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField label="First Name" required><input name="first_name" value={form.first_name || ''} onChange={handleChange} className="input-field" /></FormField>
                <FormField label="Middle Name"><input name="middle_name" value={form.middle_name || ''} onChange={handleChange} className="input-field" /></FormField>
                <FormField label="Last Name" required><input name="last_name" value={form.last_name || ''} onChange={handleChange} className="input-field" /></FormField>
                <FormField label="Gender" required>
                  <select name="gender" value={form.gender || ''} onChange={handleChange} className="input-field">
                    <option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                  </select>
                </FormField>
                <FormField label="Date of Birth" required><input type="date" name="date_of_birth" value={form.date_of_birth || ''} onChange={handleChange} className="input-field" /></FormField>
                <FormField label="Blood Group">
                  <select name="blood_group" value={form.blood_group || ''} onChange={handleChange} className="input-field">
                    <option value="Unknown">Unknown</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="O+">O+</option><option value="O-">O-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
                  </select>
                </FormField>
              </div>
            </div>
            
            {/* Contact & Address */}
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Contact & Address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Phone" required><input type="tel" name="phone" value={form.phone || ''} onChange={handleChange} className="input-field" /></FormField>
                <FormField label="Email"><input type="email" name="email" value={form.email || ''} onChange={handleChange} className="input-field" /></FormField>
                <FormField label="Address" className="sm:col-span-2"><input name="address" value={form.address || ''} onChange={handleChange} className="input-field" /></FormField>
                <FormField label="City"><input name="city" value={form.city || ''} onChange={handleChange} className="input-field" /></FormField>
                <FormField label="Pincode"><input name="pincode" value={form.pincode || ''} onChange={handleChange} className="input-field" /></FormField>
              </div>
            </div>
            
            {/* Emergency & Insurance */}
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Emergency Contact & Insurance</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Emergency Contact Name"><input name="emergency_contact_name" value={form.emergency_contact_name || ''} onChange={handleChange} className="input-field" /></FormField>
                <FormField label="Emergency Contact Phone"><input name="emergency_contact_phone" value={form.emergency_contact_phone || ''} onChange={handleChange} className="input-field" /></FormField>
                <FormField label="Relationship"><input name="emergency_contact_relationship" value={form.emergency_contact_relationship || ''} onChange={handleChange} className="input-field" /></FormField>
                <FormField label="Insurance Provider"><input name="insurance_provider" value={form.insurance_provider || ''} onChange={handleChange} className="input-field" /></FormField>
                <FormField label="Policy Number"><input name="insurance_policy_number" value={form.insurance_policy_number || ''} onChange={handleChange} className="input-field" /></FormField>
                <FormField label="Coverage Details"><input name="insurance_coverage_details" value={form.insurance_coverage_details || ''} onChange={handleChange} className="input-field" /></FormField>
              </div>
            </div>

            {/* Tags & Status */}
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Patient Status & Tags</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div>
                    <div className="font-bold text-gray-900">VIP Status</div>
                    <div className="text-xs text-gray-500">Priority scheduling</div>
                  </div>
                  <input type="checkbox" name="is_vip" checked={form.is_vip || false} onChange={handleChange} className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div>
                    <div className="font-bold text-gray-900">High-Risk Patient</div>
                    <div className="text-xs text-gray-500">Requires special attention</div>
                  </div>
                  <input type="checkbox" name="is_high_risk" checked={form.is_high_risk || false} onChange={handleChange} className="w-5 h-5 text-red-600" />
                </div>
                {form.is_high_risk && (
                  <FormField label="Risk Details" className="sm:col-span-2">
                    <textarea name="risk_details" value={form.risk_details || ''} onChange={handleChange} className="input-field bg-red-50/20 border-red-200" rows={2} />
                  </FormField>
                )}
              </div>
            </div>
          </div>

          <div className={activeTab === 'medical' ? 'block space-y-6' : 'hidden'}>
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Medical Questionnaire</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" name="has_diabetes" checked={form.has_diabetes || false} onChange={handleChange} className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Patient has Diabetes</span>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" name="has_hypertension" checked={form.has_hypertension || false} onChange={handleChange} className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Patient has Hypertension</span>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" name="has_heart_disease" checked={form.has_heart_disease || false} onChange={handleChange} className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Patient has Heart Disease</span>
                </label>
              </div>
              
              <FormField label="Other Conditions / General Medical History" className="mb-6">
                <textarea name="other_conditions" value={form.other_conditions || ''} onChange={handleChange} className="input-field" rows={4} placeholder="List any other ongoing conditions, past major illnesses, etc." />
              </FormField>

              <h2 className="text-base font-semibold text-gray-900 mb-4">Lifestyle & Pregnancy</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Smoker Status">
                  <select name="smoker_status" value={form.smoker_status || 'NEVER'} onChange={handleChange} className="input-field">
                    <option value="NEVER">Never Smoked</option><option value="FORMER">Former Smoker</option><option value="CURRENT">Current Smoker</option>
                  </select>
                </FormField>
                <FormField label="Alcohol Consumption">
                  <select name="alcohol_consumption" value={form.alcohol_consumption || 'NONE'} onChange={handleChange} className="input-field">
                    <option value="NONE">None</option><option value="OCCASIONAL">Occasional</option><option value="REGULAR">Regular</option><option value="HEAVY">Heavy</option>
                  </select>
                </FormField>
                <div className="sm:col-span-2 p-4 border rounded-lg bg-pink-50/30">
                  <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input type="checkbox" name="is_pregnant" checked={form.is_pregnant || false} onChange={handleChange} className="w-5 h-5 text-pink-500" />
                    <span className="font-medium text-gray-900">Patient is currently Pregnant</span>
                  </label>
                  {form.is_pregnant && (
                    <FormField label="Estimated Due Date">
                      <input type="date" name="pregnancy_due_date" value={form.pregnancy_due_date || ''} onChange={handleChange} className="input-field max-w-xs" />
                    </FormField>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button type="button" onClick={() => navigate('/patients')} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>

      {activeTab === 'lists' && isEdit && (
        <ClinicalLists patientId={id} />
      )}
    </div>
  );
}

// Sub-component to handle the 3 clinical lists
function ClinicalLists({ patientId }) {
  const [allergies, setAllergies] = useState([]);
  const [medications, setMedications] = useState([]);
  const [surgeries, setSurgeries] = useState([]);

  const loadData = async () => {
    try {
      const [a, m, s] = await Promise.all([
        patientsAPI.getAllergies(patientId),
        patientsAPI.getMedications(patientId),
        patientsAPI.getSurgeries(patientId)
      ]);
      setAllergies(a.data);
      setMedications(m.data);
      setSurgeries(s.data);
    } catch (err) {
      toast.error('Failed to load clinical lists');
    }
  };

  useEffect(() => { loadData(); }, [patientId]);

  return (
    <div className="space-y-6">
      <ListManager 
        title="Allergies" 
        data={allergies} 
        onDelete={(id) => patientsAPI.deleteAllergy(patientId, id).then(loadData)}
        onAdd={(data) => patientsAPI.createAllergy(patientId, data).then(loadData)}
        fields={[
          { name: 'allergen', label: 'Allergen', type: 'text', required: true },
          { name: 'severity', label: 'Severity', type: 'select', options: ['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING'] },
          { name: 'notes', label: 'Reaction/Notes', type: 'text' }
        ]}
      />
      
      <ListManager 
        title="Current Medications" 
        data={medications} 
        onDelete={(id) => patientsAPI.deleteMedication(patientId, id).then(loadData)}
        onAdd={(data) => patientsAPI.createMedication(patientId, data).then(loadData)}
        fields={[
          { name: 'medication_name', label: 'Medication', type: 'text', required: true },
          { name: 'dosage', label: 'Dosage', type: 'text' },
          { name: 'frequency', label: 'Frequency', type: 'text' },
          { name: 'start_date', label: 'Started On', type: 'date' }
        ]}
      />

      <ListManager 
        title="Dental Surgery History" 
        data={surgeries} 
        onDelete={(id) => patientsAPI.deleteSurgery(patientId, id).then(loadData)}
        onAdd={(data) => patientsAPI.createSurgery(patientId, data).then(loadData)}
        fields={[
          { name: 'procedure_name', label: 'Procedure', type: 'text', required: true },
          { name: 'procedure_date', label: 'Date', type: 'date' },
          { name: 'dentist_name', label: 'Dentist/Clinic', type: 'text' },
          { name: 'complications', label: 'Complications', type: 'text' }
        ]}
      />
    </div>
  );
}

function ListManager({ title, data, onDelete, onAdd, fields }) {
  const [form, setForm] = useState({});
  const [adding, setAdding] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onAdd(form);
      setForm({});
      setAdding(false);
      toast.success('Added successfully');
    } catch {
      toast.error('Failed to add record');
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <button onClick={() => setAdding(!adding)} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add New
        </button>
      </div>

      {adding && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 border rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {fields.map(f => (
              <FormField key={f.name} label={f.label} required={f.required}>
                {f.type === 'select' ? (
                  <select name={f.name} value={form[f.name] || ''} onChange={e => setForm({...form, [f.name]: e.target.value})} className="input-field" required={f.required}>
                    <option value="">Select...</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type} name={f.name} value={form[f.name] || ''} onChange={e => setForm({...form, [f.name]: e.target.value})} className="input-field" required={f.required} />
                )}
              </FormField>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAdding(false)} className="text-sm font-medium text-gray-500 hover:text-gray-900 px-3">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">Save Record</button>
          </div>
        </form>
      )}

      {data.length === 0 ? (
        <div className="text-center text-gray-400 py-6 text-sm">No records found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
              <tr>
                {fields.map(f => <th key={f.name} className="px-4 py-2">{f.label}</th>)}
                <th className="px-4 py-2 w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  {fields.map(f => (
                    <td key={f.name} className="px-4 py-3 text-gray-900">
                      {f.name === 'severity' ? (
                        <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold">{item.severity_display || item.severity}</span>
                      ) : (
                        item[f.name] || '-'
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => onDelete(item.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
