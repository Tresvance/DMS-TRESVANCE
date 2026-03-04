import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supportAPI } from '../services/api';
import { StatCard, Spinner } from '../components/UI';
import { Ticket, Clock, CheckCircle, AlertTriangle, XCircle, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SupportDashboard() {
  const { user }  = useAuth();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supportAPI.ticketDashboard()
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Overview of all support tickets</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Tickets"  value={stats?.total}       icon={Ticket}       color="blue" />
        <StatCard label="Open"           value={stats?.open}        icon={Clock}        color="orange" />
        <StatCard label="In Progress"    value={stats?.in_progress} icon={RefreshCw}    color="purple" />
        <StatCard label="Resolved"       value={stats?.resolved}    icon={CheckCircle}  color="green" />
        <StatCard label="Closed"         value={stats?.closed}      icon={XCircle}      color="teal" />
        <StatCard label="Critical"       value={stats?.critical}    icon={AlertTriangle} color="red" />
        <StatCard label="High Priority"  value={stats?.high}        icon={AlertTriangle} color="orange" />
        {user?.role === 'SUPER_ADMIN' && (
          <StatCard label="Unassigned" value={stats?.unassigned} icon={Users} color="red" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/support/tickets"
              className="p-3 rounded-xl text-sm font-medium text-center bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
              View All Tickets
            </Link>
            {['CLINIC_ADMIN','DOCTOR','RECEPTION'].includes(user?.role) && (
              <Link to="/support/tickets/new"
                className="p-3 rounded-xl text-sm font-medium text-center bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                Raise New Ticket
              </Link>
            )}
            <Link to="/support/tickets?status=Open"
              className="p-3 rounded-xl text-sm font-medium text-center bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors">
              Open Tickets
            </Link>
            <Link to="/support/tickets?status=Resolved"
              className="p-3 rounded-xl text-sm font-medium text-center bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors">
              Resolved Tickets
            </Link>
          </div>
        </div>

        {/* By clinic breakdown (Super Admin only) */}
        {user?.role === 'SUPER_ADMIN' && stats?.by_clinic?.length > 0 && (
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Tickets by Clinic</h2>
            <div className="space-y-2">
              {stats.by_clinic.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{c.clinic__clinic_name}</span>
                  <span className="font-semibold text-blue-600">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By category */}
        {user?.role === 'SUPER_ADMIN' && stats?.by_category?.length > 0 && (
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Tickets by Category</h2>
            <div className="space-y-2">
              {stats.by_category.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{c.category}</span>
                  <span className="font-semibold text-blue-600">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
