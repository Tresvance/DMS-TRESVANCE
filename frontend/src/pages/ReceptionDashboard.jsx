import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authAPI, appointmentsAPI } from '../services/api';
import { StatCard, Spinner, StatusBadge, Table } from '../components/UI';
import { Calendar, Users, UserPlus, CreditCard, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function ReceptionDashboard() {
  const [stats, setStats] = useState(null);
  const [todayAppts, setTodayAppts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    Promise.all([
      authAPI.dashboard(),
      appointmentsAPI.list({ appointment_date: today })
    ]).then(([{ data: s }, { data: a }]) => {
      setStats(s);
      setTodayAppts(a.results || a);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reception Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Appointments Today" value={stats?.appointments_today} icon={Calendar} color="blue" />
        <StatCard label="Total Patients" value={stats?.total_patients} icon={Users} color="purple" />
        <StatCard label="New Patients Today" value={stats?.new_patients_today} icon={UserPlus} color="green" />
        <StatCard label="Today's Revenue" value={`₹${Number(stats?.billing_today || 0).toLocaleString()}`} icon={CreditCard} color="teal" />
        <StatCard label="Pending Bills" value={stats?.pending_bills} icon={TrendingUp} color="orange" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: '+ New Patient', to: '/patients/new', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
          { label: 'Book Appointment', to: '/appointments', color: 'bg-green-600 hover:bg-green-700 text-white' },
          { label: 'Create Bill', to: '/billing', color: 'bg-orange-500 hover:bg-orange-600 text-white' },
        ].map(({ label, to, color }) => (
          <Link key={to} to={to} className={`block p-4 rounded-xl text-center font-medium transition-colors ${color}`}>
            {label}
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Today's Schedule</h2>
          <Link to="/appointments" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>
        {todayAppts.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">No appointments today</p>
        ) : (
          <Table headers={['Patient', 'Doctor', 'Time', 'Reason', 'Status']}>
            {todayAppts.map(appt => (
              <tr key={appt.id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{appt.patient_name}</span>
                    {appt.is_first_visit && (
                      <span className="px-1 py-0.5 text-[8px] font-black bg-indigo-100 text-indigo-700 rounded-md uppercase tracking-tight">First Visit</span>
                    )}
                  </div>
                </td>
                <td className="table-cell">{appt.doctor_name}</td>
                <td className="table-cell">{appt.appointment_time?.slice(0, 5)}</td>
                <td className="table-cell text-gray-500 max-w-xs truncate">{appt.reason}</td>
                <td className="table-cell"><StatusBadge status={appt.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
