import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { PageHeader, FormField } from '../components/UI';
import { Lock, User, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [passwordError, setPasswordError] = useState('');

  const validatePassword = (pwd) => {
    if (pwd.length < 12) return "Password must be at least 12 characters long.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain an uppercase letter.";
    if (!/[a-z]/.test(pwd)) return "Password must contain a lowercase letter.";
    if (!/[0-9]/.test(pwd)) return "Password must contain a number.";
    if (!/[^A-Za-z0-9]/.test(pwd)) return "Password must contain a special character.";
    return "";
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordError("New passwords do not match.");
      return;
    }

    const valError = validatePassword(passwords.new_password);
    if (valError) {
      setPasswordError(valError);
      return;
    }

    try {
      setLoading(true);
      await authAPI.changePassword({
        old_password: passwords.old_password,
        new_password: passwords.new_password
      });
      toast.success("Password changed successfully.");
      setPasswords({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.old_password?.[0] || 'Failed to change password';
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Settings & Profile" 
        subtitle="Manage your personal information and security settings" 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-4 mb-6">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <User className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user?.first_name} {user?.last_name}</h2>
                <p className="text-gray-500 font-medium">{user?.role_display || user?.role}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase">Email Address</label>
                <div className="mt-1 font-medium text-gray-900">{user?.email}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase">Phone Number</label>
                <div className="mt-1 font-medium text-gray-900">{user?.phone || 'Not provided'}</div>
              </div>
              {user?.clinic_name && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase">Clinic</label>
                  <div className="mt-1 font-medium text-gray-900">{user?.clinic_name}</div>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <h3 className="font-semibold text-blue-900 flex items-center mb-2">
              <ShieldAlert className="w-5 h-5 mr-2" /> Security Tips
            </h3>
            <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
              <li>Use a password manager to generate and store your passwords safely.</li>
              <li>Never reuse passwords across different platforms.</li>
              <li>Your password must be at least 12 characters long.</li>
            </ul>
          </div>
        </div>

        {/* Password Change Form */}
        <div className="col-span-1 lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center mb-6">
              <Lock className="w-5 h-5 mr-2 text-gray-400" />
              Change Password
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <FormField label="Current Password" required>
                <input 
                  type="password" 
                  value={passwords.old_password}
                  onChange={(e) => setPasswords(p => ({ ...p, old_password: e.target.value }))}
                  className="input-field" 
                  placeholder="Enter current password"
                  required
                />
              </FormField>

              <FormField label="New Password" required>
                <input 
                  type="password" 
                  value={passwords.new_password}
                  onChange={(e) => setPasswords(p => ({ ...p, new_password: e.target.value }))}
                  className="input-field" 
                  placeholder="At least 12 characters"
                  required
                />
              </FormField>

              <FormField label="Confirm New Password" required>
                <input 
                  type="password" 
                  value={passwords.confirm_password}
                  onChange={(e) => setPasswords(p => ({ ...p, confirm_password: e.target.value }))}
                  className="input-field" 
                  placeholder="Retype new password"
                  required
                />
              </FormField>

              {passwordError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                  {passwordError}
                </div>
              )}

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
