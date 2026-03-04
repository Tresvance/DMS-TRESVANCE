import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Building2, UserPlus, Calendar,
  FileText, Pill, CreditCard, LogOut, Menu, X,
  Stethoscope, ChevronDown, ShieldCheck, Ticket, HeadphonesIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

const navConfig = {
  SUPER_ADMIN: [
    { to: '/super/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/super/clinics',        icon: Building2,       label: 'Clinics' },
    { to: '/super/clinic-admins',  icon: ShieldCheck,     label: 'Clinic Admins' },
    { to: '/super/agents',         icon: HeadphonesIcon,  label: 'Support Agents' },
    { divider: true },
    { to: '/support/dashboard',    icon: LayoutDashboard, label: 'Support Dashboard' },
    { to: '/support/tickets',      icon: Ticket,          label: 'All Tickets' },
  ],
  SUPPORT_AGENT: [
    { to: '/support/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/support/tickets',      icon: Ticket,          label: 'My Tickets' },
  ],
  CLINIC_ADMIN: [
    { to: '/clinic/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clinic/staff',         icon: Users,           label: 'Staff' },
    { to: '/patients',             icon: UserPlus,        label: 'Patients' },
    { to: '/appointments',         icon: Calendar,        label: 'Appointments' },
    { to: '/records',              icon: FileText,        label: 'Records' },
    { to: '/medicines',            icon: Pill,            label: 'Medicines' },
    { to: '/billing',              icon: CreditCard,      label: 'Billing' },
    { divider: true },
    { to: '/support/tickets',      icon: Ticket,          label: 'Support Tickets' },
  ],
  DOCTOR: [
    { to: '/doctor/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patients',             icon: UserPlus,        label: 'Patients' },
    { to: '/appointments',         icon: Calendar,        label: 'Appointments' },
    { to: '/records',              icon: FileText,        label: 'Records' },
    { to: '/medicines',            icon: Pill,            label: 'Medicines' },
    { divider: true },
    { to: '/support/tickets',      icon: Ticket,          label: 'Support Tickets' },
  ],
  RECEPTION: [
    { to: '/reception/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patients',             icon: UserPlus,        label: 'Patients' },
    { to: '/appointments',         icon: Calendar,        label: 'Appointments' },
    { to: '/billing',              icon: CreditCard,      label: 'Billing' },
    { divider: true },
    { to: '/support/tickets',      icon: Ticket,          label: 'Support Tickets' },
  ],
};

const roleLabels = {
  SUPER_ADMIN:   { label: 'Super Admin',    color: 'bg-red-100 text-red-700' },
  SUPPORT_AGENT: { label: 'Support Agent',  color: 'bg-yellow-100 text-yellow-700' },
  CLINIC_ADMIN:  { label: 'Clinic Admin',   color: 'bg-purple-100 text-purple-700' },
  DOCTOR:        { label: 'Doctor',         color: 'bg-green-100 text-green-700' },
  RECEPTION:     { label: 'Receptionist',   color: 'bg-blue-100 text-blue-700' },
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navItems = navConfig[user?.role] || [];
  const roleInfo = roleLabels[user?.role] || { label: user?.role, color: 'bg-gray-100 text-gray-700' };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-gradient-to-b from-blue-900 to-blue-800 text-white flex flex-col transition-all duration-300 flex-shrink-0`}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-blue-700">
          <div className="flex-shrink-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-blue-700" />
          </div>
          {sidebarOpen && (
            <div>
              <div className="font-bold text-sm">DMS-TRESVANCE</div>
              <div className="text-xs text-blue-300">Dental Management</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item, idx) => {
            if (item.divider) return (
              <div key={idx} className="mx-4 my-2 border-t border-blue-700 opacity-50" />
            );
            const { to, icon: Icon, label } = item;
            return (
              <NavLink key={to} to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors mb-0.5
                  ${isActive ? 'bg-white/20 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {sidebarOpen && (
          <div className="p-4 border-t border-blue-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                {user?.full_name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user?.full_name}</div>
                <span className={`text-xs px-1.5 py-0.5 rounded ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3">
            {user?.clinic_name && (
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {user.clinic_name}
              </span>
            )}
            {user?.role === 'SUPER_ADMIN' && (
              <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-full font-medium">
                Tresvance HQ
              </span>
            )}
            {user?.role === 'SUPPORT_AGENT' && (
              <span className="text-xs bg-yellow-50 text-yellow-600 border border-yellow-200 px-2 py-1 rounded-full font-medium">
                Support Team
              </span>
            )}
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user?.full_name?.[0]?.toUpperCase()}
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <button onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
