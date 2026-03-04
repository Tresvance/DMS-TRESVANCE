import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authAPI, appointmentsAPI } from '../services/api';
import { StatCard, Spinner, Table, StatusBadge } from '../components/UI';
import { Users, UserPlus, Calendar, CreditCard, TrendingUp, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';

export default function ClinicAdminDashboard() {
  const [stats, setStats]     = useState(null);
  const [appts, setAppts]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    Promise.all([
      authAPI.dashboard(),
      appointmentsAPI.list({ appointment_date: today }),
    ]).then(([{ data: s }, { data: a }]) => {
      setStats(s);
      setAppts(a.results || a);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clinic Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Doctors"            value={stats?.total_doctors}      icon={Stethoscope} color="green" />
        <StatCard label="Receptionists"      value={stats?.total_reception}    icon={Users}       color="blue" />
        <StatCard label="Total Patients"     value={stats?.total_patients}     icon={UserPlus}    color="purple" />
        <StatCard label="Appointments Today" value={stats?.appointments_today} icon={Calendar}    color="orange" />
        <StatCard label="Revenue Collected"  value={`₹${Number(stats?.total_revenue || 0).toLocaleString()}`}   icon={CreditCard}  color="teal" />
        <StatCard label="Pending Balance"    value={`₹${Number(stats?.pending_balance || 0).toLocaleString()}`} icon={TrendingUp}  color="red" />
        <StatCard label="Pending Bills"      value={stats?.pending_bills}      icon={CreditCard}  color="orange" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link to="/clinic/staff"   className="p-3 rounded-xl text-sm font-medium text-center bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"> Add Staff</Link>
        <Link to="/patients/new"   className="p-3 rounded-xl text-sm font-medium text-center bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"> New Patient</Link>
        <Link to="/appointments"   className="p-3 rounded-xl text-sm font-medium text-center bg-green-50 text-green-700 hover:bg-green-100 transition-colors">Appointments</Link>
        <Link to="/billing"        className="p-3 rounded-xl text-sm font-medium text-center bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors">Billing</Link>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Today's Appointments</h2>
          <Link to="/appointments" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>
        {appts.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">No appointments today</p>
        ) : (
          <Table headers={['Patient', 'Doctor', 'Time', 'Reason', 'Status']}>
            {appts.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{a.patient_name}</td>
                <td className="table-cell">{a.doctor_name}</td>
                <td className="table-cell">{a.appointment_time?.slice(0, 5)}</td>
                <td className="table-cell text-gray-500 max-w-xs truncate">{a.reason}</td>
                <td className="table-cell"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
