import { useState, useEffect } from 'react';
import { authAPI, appointmentsAPI } from '../services/api';
import { StatCard, Spinner, StatusBadge, Table } from '../components/UI';
import { Calendar, Users, Clock, CheckCircle, FileText, Star, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function DoctorDashboard() {
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
        <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your schedule for today – {format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Appointments Today" value={stats?.appointments_today} icon={Calendar} color="blue" />
        <StatCard label="Scheduled" value={stats?.scheduled_today} icon={Clock} color="orange" />
        <StatCard label="Completed Today" value={stats?.completed_today} icon={CheckCircle} color="green" />
        <StatCard label="Total Patients" value={stats?.total_patients} icon={Users} color="purple" />
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Today's Appointments</h2>
        {todayAppts.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">No appointments scheduled for today</p>
        ) : (
          <Table headers={['Patient', 'Time', 'Reason', 'Status']}>
            {todayAppts.map(appt => (
              <tr key={appt.id} className="hover:bg-gray-50">
                <td className="table-cell">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{appt.patient_name}</span>
                      {appt.patient_is_vip && (
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      )}
                      {appt.is_first_visit && (
                        <span className="px-1 py-0.5 text-[8px] font-black bg-indigo-100 text-indigo-700 rounded-md uppercase tracking-tight">First Visit</span>
                      )}
                    </div>
                    {appt.patient_is_high_risk && (
                      <div className="flex items-center gap-1 text-[8px] font-bold text-red-600">
                        <AlertCircle className="w-2.5 h-2.5" />
                        HIGH RISK: {appt.patient_risk_details || 'Critical'}
                      </div>
                    )}
                  </div>
                </td>
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
