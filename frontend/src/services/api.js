import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor – attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – auto refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────
export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/users/me/'),
  changePassword: (data) => api.post('/auth/users/change_password/', data),
  dashboard: () => api.get('/auth/dashboard/'),
};

// ── Users ─────────────────────────────────────────────
export const usersAPI = {
  list: (params) => api.get('/auth/users/', { params }),
  get: (id) => api.get(`/auth/users/${id}/`),
  create: (data) => api.post('/auth/users/', data),
  update: (id, data) => api.put(`/auth/users/${id}/`, data),
  patch: (id, data) => api.patch(`/auth/users/${id}/`, data),
  delete: (id) => api.delete(`/auth/users/${id}/`),
};

// ── Staff Credentials & Audit Logs ────────────────────
export const staffCredentialsAPI = {
  list: (params) => api.get('/auth/staff-credentials/', { params }),
  create: (data) => api.post('/auth/staff-credentials/', data),
  delete: (id) => api.delete(`/auth/staff-credentials/${id}/`),
};

export const auditLogsAPI = {
  list: (params) => api.get('/auth/audit-logs/', { params }),
};


// ── Clinics ───────────────────────────────────────────
export const clinicsAPI = {
  list: (params) => api.get('/clinics/', { params }),
  get: (id) => api.get(`/clinics/${id}/`),
  create: (data) => api.post('/clinics/', data),
  update: (id, data) => api.put(`/clinics/${id}/`, data),
  patch: (id, data) => api.patch(`/clinics/${id}/`, data),
  delete: (id) => api.delete(`/clinics/${id}/`),
  // Subscription
  getSubscriptionStatus: (clinicId) => api.get(`/clinics/${clinicId}/subscription/`),
};

export const clinicSettingsAPI = {
  list: (params) => api.get('/clinics/settings/', { params }),
  get: (id) => api.get(`/clinics/settings/${id}/`),
  create: (data) => api.post('/clinics/settings/', data),
  update: (id, data) => api.put(`/clinics/settings/${id}/`, data),
  patch: (id, data) => api.patch(`/clinics/settings/${id}/`, data),
};

export const clinicHolidaysAPI = {
  list: (params) => api.get('/clinics/holidays/', { params }),
  create: (data) => api.post('/clinics/holidays/', data),
  delete: (id) => api.delete(`/clinics/holidays/${id}/`),
};

// ── Clinic (public) ───────────────────────────────────
export const clinicAPI = {
  getBySubdomain: (subdomain) => api.get('/clinics/info/', { params: { subdomain } }),
};

// ── Payments ──────────────────────────────────────────
export const paymentsAPI = {
  list: (params) => api.get('/clinics/payments/', { params }),
  createOrder: (data) => api.post('/clinics/payments/create-order/', data),
  verify: (data) => api.post('/clinics/payments/verify/', data),
};

// ── Patients ──────────────────────────────────────────
export const patientsAPI = {
  list: (params) => api.get('/patients/', { params }),
  get: (id) => api.get(`/patients/${id}/`),
  create: (data) => api.post('/patients/', data),
  update: (id, data) => api.put(`/patients/${id}/`, data),
  patch: (id, data) => api.patch(`/patients/${id}/`, data),
  delete: (id) => api.delete(`/patients/${id}/`),
  getDuplicates: () => api.get('/patients/duplicates/'),
  merge: (primaryId, duplicateId) => api.post(`/patients/${primaryId}/merge/`, { duplicate_id: duplicateId }),
  exportFHIR: (id) => api.get(`/patients/${id}/export_fhir/`, { responseType: 'blob' }),
  importFHIR: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/patients/import_fhir/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getConsents: (id) => api.get(`/patients/${id}/consents/`),
  createConsent: (id, data) => api.post(`/patients/${id}/consents/`, data),
  analytics: () => api.get('/patients/analytics/'),
  autoArchive: () => api.post('/patients/auto_archive/'),
  restoreArchive: (id) => api.post(`/patients/${id}/restore/`),
  
  // Medical Lists
  getAllergies: (id) => api.get(`/patients/${id}/allergies/`),
  createAllergy: (id, data) => api.post(`/patients/${id}/allergies/`, data),
  deleteAllergy: (id, allergyId) => api.delete(`/patients/${id}/allergies/${allergyId}/`),
  
  getMedications: (id) => api.get(`/patients/${id}/medications/`),
  createMedication: (id, data) => api.post(`/patients/${id}/medications/`, data),
  deleteMedication: (id, medId) => api.delete(`/patients/${id}/medications/${medId}/`),
  
  getSurgeries: (id) => api.get(`/patients/${id}/surgeries/`),
  createSurgery: (id, data) => api.post(`/patients/${id}/surgeries/`, data),
  deleteSurgery: (id, surgId) => api.delete(`/patients/${id}/surgeries/${surgId}/`),
};

// ── Patient Documents (X-rays, Scans, Reports) ────────
export const patientDocumentsAPI = {
  list: (params) => api.get('/patients/documents/', { params }),
  get: (id) => api.get(`/patients/documents/${id}/`),
  getTypes: () => api.get('/patients/documents/types/'),
  upload: (data) => api.post('/patients/documents/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/patients/documents/${id}/`),
  // Get documents for specific patient
  listByPatient: (patientId) => api.get('/patients/documents/', { params: { patient: patientId } }),
};

// ── Appointments ──────────────────────────────────────
export const appointmentsAPI = {
  list: (params) => api.get('/appointments/', { params }),
  get: (id) => api.get(`/appointments/${id}/`),
  create: (data) => api.post('/appointments/', data),
  update: (id, data) => api.put(`/appointments/${id}/`, data),
  patch: (id, data) => api.patch(`/appointments/${id}/`, data),
  delete: (id) => api.delete(`/appointments/${id}/`),
  checkIn: (id, data) => api.post(`/appointments/${id}/check_in/`, data),
  getQueue: () => api.get('/appointments/queue/'),
};

export const waitlistAPI = {
  list: (params) => api.get('/appointments/waitlist/', { params }),
  get: (id) => api.get(`/appointments/waitlist/${id}/`),
  create: (data) => api.post('/appointments/waitlist/', data),
  update: (id, data) => api.put(`/appointments/waitlist/${id}/`, data),
  patch: (id, data) => api.patch(`/appointments/waitlist/${id}/`, data),
  delete: (id) => api.delete(`/appointments/waitlist/${id}/`),
  getAnalytics: () => api.get('/appointments/waitlist/analytics/'),
};

export const treatmentTypesAPI = {
  list: (params) => api.get('/appointments/treatment-types/', { params }),
  get: (id) => api.get(`/appointments/treatment-types/${id}/`),
  create: (data) => api.post('/appointments/treatment-types/', data),
  update: (id, data) => api.put(`/appointments/treatment-types/${id}/`, data),
  delete: (id) => api.delete(`/appointments/treatment-types/${id}/`),
};

export const blockTimesAPI = {
  list: (params) => api.get('/appointments/block-times/', { params }),
  get: (id) => api.get(`/appointments/block-times/${id}/`),
  create: (data) => api.post('/appointments/block-times/', data),
  update: (id, data) => api.put(`/appointments/block-times/${id}/`, data),
  delete: (id) => api.delete(`/appointments/block-times/${id}/`),
};

// ── Records ───────────────────────────────────────────
export const recordsAPI = {
  list: (params) => api.get('/records/', { params }),
  get: (id) => api.get(`/records/${id}/`),
  create: (data) => api.post('/records/', data),
  update: (id, data) => api.put(`/records/${id}/`, data),
  patch: (id, data) => api.patch(`/records/${id}/`, data),
  delete: (id) => api.delete(`/records/${id}/`),
  sign: (id) => api.post(`/records/${id}/sign/`),
};

// ── Medicines ─────────────────────────────────────────
export const medicinesAPI = {
  list: (params) => api.get('/medicines/', { params }),
  get: (id) => api.get(`/medicines/${id}/`),
  create: (data) => api.post('/medicines/', data),
  update: (id, data) => api.put(`/medicines/${id}/`, data),
  patch: (id, data) => api.patch(`/medicines/${id}/`, data),
  delete: (id) => api.delete(`/medicines/${id}/`),
};

// ── Billing ───────────────────────────────────────────
export const billingAPI = {
  list: (params) => api.get('/billing/', { params }),
  get: (id) => api.get(`/billing/${id}/`),
  create: (data) => api.post('/billing/', data),
  update: (id, data) => api.put(`/billing/${id}/`, data),
  patch: (id, data) => api.patch(`/billing/${id}/`, data),
  delete: (id) => api.delete(`/billing/${id}/`),
};

// ── Shifts ────────────────────────────────────────────
export const shiftsAPI = {
  list:   (params) => api.get('/shifts/', { params }),
  get:    (id)     => api.get(`/shifts/${id}/`),
  create: (data)   => api.post('/shifts/', data),
  update: (id, data) => api.put(`/shifts/${id}/`, data),
  patch:  (id, data) => api.patch(`/shifts/${id}/`, data),
  delete: (id)     => api.delete(`/shifts/${id}/`),
};

export const leavesAPI = {
  list: (params) => api.get('/shifts/leaves/', { params }),
  get: (id) => api.get(`/shifts/leaves/${id}/`),
  create: (data) => api.post('/shifts/leaves/', data),
  update: (id, data) => api.put(`/shifts/leaves/${id}/`, data),
  patch: (id, data) => api.patch(`/shifts/leaves/${id}/`, data),
  delete: (id) => api.delete(`/shifts/leaves/${id}/`),
};




// ── Support / Tickets ─────────────────────────────
export const supportAPI = {
  // Tickets
  listTickets:     (params) => api.get('/support/tickets/', { params }),
  getTicket:       (id)     => api.get(`/support/tickets/${id}/`),
  createTicket:    (data)   => api.post('/support/tickets/', data),
  updateTicket:    (id, data) => api.patch(`/support/tickets/${id}/`, data),
  deleteTicket:    (id)     => api.delete(`/support/tickets/${id}/`),
  // Actions
  addComment:      (id, data) => api.post(`/support/tickets/${id}/comment/`, data),
  updateStatus:    (id, data) => api.patch(`/support/tickets/${id}/status/`, data),
  assignTicket:    (id, data) => api.patch(`/support/tickets/${id}/assign/`, data),
  uploadAttachment:(id, form) => api.post(`/support/tickets/${id}/attach/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // Dashboard
  ticketDashboard: () => api.get('/support/tickets/dashboard/'),
  // Agents
  listAgents:      () => api.get('/support/agents/'),
};

// ── Clinical Notes ────────────────────────────────────
export const clinicalNotesAPI = {
  list: (params) => api.get('/records/notes/', { params }),
  create: (data) => api.post('/records/notes/', data),
  update: (id, data) => api.patch(`/records/notes/${id}/`, data),
  delete: (id) => api.delete(`/records/notes/${id}/`),
  listByRecord: (recordId) => api.get('/records/notes/', { params: { medical_record: recordId } }),
  getVersions: (id) => api.get(`/records/notes/${id}/versions/`),
};

export default api;
