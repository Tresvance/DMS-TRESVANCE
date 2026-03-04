import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { StatCard, Spinner, Table } from '../components/UI';
import { Building2, Users, TrendingUp, UserCheck, Calendar, DollarSign, ShieldCheck } from 'lucide-react';

export default function SuperAdminDashboard() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authAPI.dashboard().then(({ data }) => setStats(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tresvance HQ Dashboard</h1>
            <p className="text-gray-500 text-sm">System-wide overview across all clinics</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Clinics"       value={stats?.total_clinics}       icon={Building2}   color="blue" />
        <StatCard label="Clinic Admins"       value={stats?.total_clinic_admins} icon={ShieldCheck} color="purple" />
        <StatCard label="Total Doctors"       value={stats?.total_doctors}       icon={Users}       color="green" />
        <StatCard label="Total Patients"      value={stats?.total_patients}      icon={UserCheck}   color="teal" />
        <StatCard label="Appointments Today"  value={stats?.appointments_today}  icon={Calendar}    color="orange" />
        <StatCard label="Total Staff"         value={stats?.total_staff}         icon={Users}       color="blue" />
        <StatCard label="Total Revenue"       value={`₹${Number(stats?.total_revenue || 0).toLocaleString()}`}    icon={DollarSign}  color="green" />
        <StatCard label="Pending Balance"     value={`₹${Number(stats?.pending_balance || 0).toLocaleString()}`} icon={TrendingUp}  color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/super/clinics"       className="p-4 rounded-xl text-sm font-medium text-center bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">Manage Clinics</Link>
            <Link to="/super/clinic-admins" className="p-4 rounded-xl text-sm font-medium text-center bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">Manage Clinic Admins</Link>
          </div>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Access Hierarchy</h2>
          <div className="space-y-2 text-sm">
            {[
              { role: 'Super Admin (You)',  desc: 'Creates clinics & clinic admins',         color: 'bg-red-50 text-red-700 border-red-200' },
              { role: 'Clinic Admin',       desc: 'Manages staff within their clinic',        color: 'bg-purple-50 text-purple-700 border-purple-200' },
              { role: 'Doctor',             desc: 'Patients, appointments, records',          color: 'bg-green-50 text-green-700 border-green-200' },
              { role: 'Receptionist',       desc: 'Patients, appointments, billing',          color: 'bg-blue-50 text-blue-700 border-blue-200' },
            ].map(({ role, desc, color }) => (
              <div key={role} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${color}`}>
                <span className="font-medium">{role}</span>
                <span className="text-xs opacity-75">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
