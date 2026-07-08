import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login                from './pages/Login';
import SuperAdminDashboard  from './pages/SuperAdminDashboard';
import ClinicAdminDashboard from './pages/ClinicAdminDashboard';
import DoctorDashboard      from './pages/DoctorDashboard';
import ReceptionDashboard   from './pages/ReceptionDashboard';
import Patients             from './pages/Patients';
import AddPatient           from './pages/AddPatient';
import PatientDocuments     from './pages/PatientDocuments';
import Appointments         from './pages/Appointments';
import Records              from './pages/Records';
import Medicines            from './pages/Medicines';
import Billing              from './pages/Billing';
import Clinics              from './pages/Clinics';
import Users                from './pages/Users';
import Tickets              from './pages/Tickets';
import NewTicket            from './pages/NewTicket';
import TicketDetail         from './pages/TicketDetail';
import SupportDashboard     from './pages/SupportDashboard';
import PaymentHistory       from './pages/PaymentHistory';
import Shifts               from './pages/Shifts';
import PatientReports       from './pages/PatientReports';
import Layout               from './components/Layout';
import Settings             from './pages/Settings';
import AuditLogs            from './pages/AuditLogs';


const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role))
    return <Navigate to="/dashboard" replace />;
  return children;
};

const DashboardRedirect = () => {
  const { user } = useAuth();
  const map = {
    SUPER_ADMIN:   '/super/dashboard',
    SUPPORT_AGENT: '/support/dashboard',
    ADMIN:         '/clinic/dashboard',
    DENTIST:       '/doctor/dashboard',
    RECEPTION:     '/reception/dashboard',
    HYGIENIST:     '/patients',
    ACCOUNT_MANAGER: '/billing',
  };
  return <Navigate to={map[user?.role] || '/login'} replace />;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login"     element={user ? <DashboardRedirect /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>

        {/* ── Super Admin ─────────────────────────────── */}
        <Route path="super/dashboard"     element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><SuperAdminDashboard /></ProtectedRoute>} />
        <Route path="super/clinics"       element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><Clinics /></ProtectedRoute>} />
        <Route path="super/clinic-admins" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><Users /></ProtectedRoute>} />
        <Route path="super/agents"        element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><Users /></ProtectedRoute>} />
        <Route path="super/payments"      element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><PaymentHistory /></ProtectedRoute>} />
        <Route path="super/audit-logs"    element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AuditLogs /></ProtectedRoute>} />

        {/* ── Clinic Admin ────────────────────────────── */}
        <Route path="clinic/dashboard" element={<ProtectedRoute allowedRoles={['ADMIN']}><ClinicAdminDashboard /></ProtectedRoute>} />
        <Route path="clinic/staff"     element={<ProtectedRoute allowedRoles={['ADMIN']}><Users /></ProtectedRoute>} />
        <Route path="clinic/shifts"    element={<ProtectedRoute allowedRoles={['ADMIN']}><Shifts /></ProtectedRoute>} />
        <Route path="clinic/reports"   element={<ProtectedRoute allowedRoles={['ADMIN']}><PatientReports /></ProtectedRoute>} />
        <Route path="clinic/payments"  element={<ProtectedRoute allowedRoles={['ADMIN']}><PaymentHistory /></ProtectedRoute>} />
        <Route path="clinic/audit-logs" element={<ProtectedRoute allowedRoles={['ADMIN']}><AuditLogs /></ProtectedRoute>} />


        {/* ── Doctor ──────────────────────────────────── */}
        <Route path="doctor/dashboard" element={<ProtectedRoute allowedRoles={['DENTIST']}><DoctorDashboard /></ProtectedRoute>} />

        {/* ── Reception ───────────────────────────────── */}
        <Route path="reception/dashboard" element={<ProtectedRoute allowedRoles={['RECEPTION']}><ReceptionDashboard /></ProtectedRoute>} />

        {/* ── Support Agent ───────────────────────────── */}
        <Route path="support/dashboard"  element={<ProtectedRoute allowedRoles={['SUPER_ADMIN','SUPPORT_AGENT']}><SupportDashboard /></ProtectedRoute>} />

        {/* ── Support / Tickets (all roles) ───────────── */}
        <Route path="support/tickets"        element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
        <Route path="support/tickets/new"    element={<ProtectedRoute allowedRoles={['ADMIN','DENTIST','RECEPTION']}><NewTicket /></ProtectedRoute>} />
        <Route path="support/tickets/:id"    element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />

        {/* ── Shared Clinical ─────────────────────────── */}
        <Route path="patients"              element={<ProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN','DENTIST','RECEPTION','HYGIENIST']}><Patients /></ProtectedRoute>} />
        <Route path="patients/new"          element={<ProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN','RECEPTION']}><AddPatient /></ProtectedRoute>} />
        <Route path="patients/:id/edit"     element={<ProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN','RECEPTION']}><AddPatient /></ProtectedRoute>} />
        <Route path="patients/:id/documents" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN','DENTIST','RECEPTION','HYGIENIST']}><PatientDocuments /></ProtectedRoute>} />
        <Route path="appointments"          element={<ProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN','DENTIST','RECEPTION','HYGIENIST']}><Appointments /></ProtectedRoute>} />
        <Route path="records"               element={<ProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN','DENTIST']}><Records /></ProtectedRoute>} />
        <Route path="medicines"             element={<ProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN','DENTIST']}><Medicines /></ProtectedRoute>} />
        <Route path="billing"               element={<ProtectedRoute allowedRoles={['SUPER_ADMIN','ADMIN','RECEPTION','ACCOUNT_MANAGER']}><Billing /></ProtectedRoute>} />

        {/* ── Settings (All Roles) ────────────────────── */}
        <Route path="settings"           element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </AuthProvider>
    </BrowserRouter>
  );
}
