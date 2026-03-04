import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clinicAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Stethoscope, Eye, EyeOff, Loader2, Building2 } from 'lucide-react';

const ROLE_REDIRECT = {
  SUPER_ADMIN:  '/super/dashboard',
  CLINIC_ADMIN: '/clinic/dashboard',
  DOCTOR:       '/doctor/dashboard',
  RECEPTION:    '/reception/dashboard',
};

// Extract subdomain from current URL
function getSubdomain() {
  const host = window.location.hostname;
  // Skip for localhost/IP
  if (host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }
  // Check if it's a subdomain of tresvance.com
  const match = host.match(/^([a-z0-9-]+)\.tresvance\.com$/i);
  if (match) {
    const sub = match[1].toLowerCase();
    // Skip reserved subdomains
    if (['www', 'api', 'admin', 'dmsdental', 'mail', 'ftp'].includes(sub)) {
      return null;
    }
    return sub;
  }
  return null;
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});
  
  // Clinic subdomain detection
  const [subdomain, setSubdomain]     = useState(null);
  const [clinic, setClinic]           = useState(null);
  const [clinicLoading, setClinicLoading] = useState(true);
  const [clinicError, setClinicError] = useState(null);

  useEffect(() => {
    const sub = getSubdomain();
    setSubdomain(sub);
    
    if (sub) {
      // Fetch clinic info
      clinicAPI.getBySubdomain(sub)
        .then(res => {
          setClinic(res.data);
          setClinicLoading(false);
        })
        .catch(err => {
          setClinicError(err.response?.data?.error || 'Clinic not found');
          setClinicLoading(false);
        });
    } else {
      setClinicLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(er => ({ ...er, [e.target.name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.email)    errs.email    = 'Email is required';
    if (!form.password) errs.password = 'Password is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const user = await login(form);
      toast.success(`Welcome, ${user.full_name}!`);
      navigate(ROLE_REDIRECT[user.role] || '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Show clinic not found error
  if (subdomain && clinicError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Building2 className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Clinic Not Found</h1>
          <p className="text-gray-600 mb-4">
            No clinic is registered for <strong>{subdomain}.tresvance.com</strong>
          </p>
          <a href="https://dmsdental.tresvance.com" 
             className="btn-primary inline-block px-6 py-2">
            Go to Main Portal
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            {clinic ? (
              <Building2 className="w-9 h-9 text-blue-700" />
            ) : (
              <Stethoscope className="w-9 h-9 text-blue-700" />
            )}
          </div>
          {clinic ? (
            <>
              <h1 className="text-3xl font-bold text-white">{clinic.clinic_name}</h1>
              <p className="text-blue-200 mt-1 text-sm">Staff Login Portal</p>
            </>
          ) : (
            <h1 className="text-3xl font-bold text-white">DMS TRESVANCE</h1>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Sign In</h2>
          <p className="text-gray-500 text-sm mb-6">Enter your credentials to access the system</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                name="email" type="email" value={form.email}
                onChange={handleChange} placeholder="you@clinic.com"
                autoComplete="email"
                className={`input-field ${errors.email ? 'border-red-400' : ''}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  name="password" type={showPass ? 'text' : 'password'}
                  value={form.password} onChange={handleChange}
                  placeholder="••••••••" autoComplete="current-password"
                  className={`input-field pr-10 ${errors.password ? 'border-red-400' : ''}`}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 mt-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          © {new Date().getFullYear()} Tresvance. All rights reserved.
        </p>
      </div>
    </div>
  );
}
