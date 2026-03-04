import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientsAPI } from '../services/api';
import { FormField, Spinner } from '../components/UI';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL_FORM = {
  first_name: '', last_name: '', gender: '', date_of_birth: '',
  phone: '', email: '', address: '', blood_group: 'Unknown',
  allergies: '', medical_history: '',
  emergency_contact_name: '', emergency_contact_phone: '',
};

export default function AddPatient() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    patientsAPI.get(id).then(({ data }) => {
      setForm({
        first_name: data.first_name, last_name: data.last_name,
        gender: data.gender, date_of_birth: data.date_of_birth,
        phone: data.phone, email: data.email || '',
        address: data.address || '', blood_group: data.blood_group,
        allergies: data.allergies || '', medical_history: data.medical_history || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
      });
    }).catch(() => toast.error('Failed to load patient'))
      .finally(() => setFetching(false));
  }, [id, isEdit]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.gender || !form.date_of_birth || !form.phone) {
      toast.error('Please fill required fields'); return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await patientsAPI.update(id, form);
        toast.success('Patient updated!');
      } else {
        await patientsAPI.create(form);
        toast.success('Patient registered!');
      }
      navigate('/patients');
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Save failed';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  if (fetching) return <Spinner />;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/patients')} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Patient' : 'Register New Patient'}</h1>
          <p className="text-sm text-gray-500">Fill in the patient details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First Name" required>
              <input name="first_name" value={form.first_name} onChange={handleChange} className="input-field" placeholder="John" />
            </FormField>
            <FormField label="Last Name" required>
              <input name="last_name" value={form.last_name} onChange={handleChange} className="input-field" placeholder="Doe" />
            </FormField>
            <FormField label="Gender" required>
              <select name="gender" value={form.gender} onChange={handleChange} className="input-field">
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </FormField>
            <FormField label="Date of Birth" required>
              <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} className="input-field" />
            </FormField>
            <FormField label="Phone" required>
              <input name="phone" value={form.phone} onChange={handleChange} className="input-field" placeholder="+91 9876543210" />
            </FormField>
            <FormField label="Email">
              <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field" placeholder="patient@email.com" />
            </FormField>
            <FormField label="Blood Group">
              <select name="blood_group" value={form.blood_group} onChange={handleChange} className="input-field">
                {['A+','A-','B+','B-','O+','O-','AB+','AB-','Unknown'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Address">
              <input name="address" value={form.address} onChange={handleChange} className="input-field" placeholder="Full address" />
            </FormField>
          </div>
        </div>

        {/* Medical Info */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Medical Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Allergies">
              <textarea name="allergies" value={form.allergies} onChange={handleChange} className="input-field" rows={3} placeholder="List any known allergies..." />
            </FormField>
            <FormField label="Medical History">
              <textarea name="medical_history" value={form.medical_history} onChange={handleChange} className="input-field" rows={3} placeholder="Previous medical conditions..." />
            </FormField>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Emergency Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Contact Name">
              <input name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} className="input-field" placeholder="Emergency contact name" />
            </FormField>
            <FormField label="Contact Phone">
              <input name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} className="input-field" placeholder="Emergency contact phone" />
            </FormField>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/patients')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Update Patient' : 'Register Patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
