import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { patientsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Table, Spinner, EmptyState, ConfirmDialog, StatusBadge } from '../components/UI';
import AdvancedSearch from '../components/AdvancedSearch';
import MergePatientDialog from '../components/MergePatientDialog';
import HistoryImportModal from '../components/HistoryImportModal';
import { 
  UserPlus, Edit2, Trash2, Eye, Users, FileImage, GitMerge, 
  SearchCode, Download, Upload, ShieldCheck, ShieldAlert, 
  FileSignature, AlertCircle, MoreVertical, IndianRupee 
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConsentManagerModal from '../components/ConsentManagerModal';

export default function Patients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ search: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [duplicateClusters, setDuplicateClusters] = useState([]);
  const [findingDuplicates, setFindingDuplicates] = useState(false);
  const [statusMenuId, setStatusMenuId] = useState(null);
  const [consentPatient, setConsentPatient] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [consentMenuId, setConsentMenuId] = useState(null);
  const canEdit = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTION'].includes(user?.role);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await patientsAPI.list(params);
      setPatients(data.results || data);
    } catch { toast.error('Failed to load patients'); }
    finally { setLoading(false); }
  }, [params]);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await patientsAPI.delete(deleteTarget.id);
      toast.success('Patient deleted');
      setDeleteTarget(null);
      loadPatients();
    } catch { toast.error('Failed to delete patient'); }
    finally { setDeleting(false); }
  };

  const findDuplicates = async () => {
    setFindingDuplicates(true);
    try {
      const { data } = await patientsAPI.getDuplicates();
      if (data.length === 0) {
        toast.success('No duplicates detected');
      } else {
        setDuplicateClusters(data);
        toast.success(`${data.length} clusters of potential duplicates found`);
      }
    } catch { toast.error('Failed to scan for duplicates'); }
    finally { setFindingDuplicates(false); }
  };

  const handleStatusChange = async (patient, newStatus) => {
    try {
      await patientsAPI.patch(patient.id, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      loadPatients();
    } catch { toast.error('Failed to update status'); }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'ACTIVE': return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Active' };
      case 'INACTIVE': return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Inactive' };
      case 'TRANSFERRED': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Transferred' };
      case 'DECEASED': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Deceased' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    }
  };

  const handleExport = async (patient) => {
    try {
      const response = await patientsAPI.exportFHIR(patient.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${patient.patient_id}_history.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('History exported successfully');
    } catch {
      toast.error('Failed to export history');
    }
  };

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} total`}
        action={canEdit && (
          <div className="flex gap-2">
            <button 
              onClick={() => setImportOpen(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import FHIR
            </button>
            <button 
              onClick={findDuplicates} 
              disabled={findingDuplicates}
              className="btn-secondary flex items-center gap-2"
            >
              <SearchCode className={`w-4 h-4 ${findingDuplicates ? 'animate-pulse' : ''}`} />
              Scan Duplicates
            </button>
            <Link to="/patients/new" className="btn-primary flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Add Patient
            </Link>
          </div>
        )}
      />

      <div className="mb-4">
        <AdvancedSearch 
          onSearch={setParams} 
          onClear={() => setParams({ search: '' })}
          placeholder="Search by name, ID, phone..."
        />
      </div>

      {duplicateClusters.length > 0 && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-orange-800 font-semibold">
              <GitMerge className="w-5 h-5" />
              <span>Potential Duplicates Detected ({duplicateClusters.length} types)</span>
            </div>
            <button 
              onClick={() => setDuplicateClusters([])} 
              className="text-xs text-orange-600 hover:text-orange-800 font-medium bg-white px-2 py-1 rounded border border-orange-200"
            >
              Clear Results
            </button>
          </div>
          <div className="space-y-3">
            {duplicateClusters.map((cluster, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg border border-orange-100 shadow-sm">
                <div className="text-xs font-bold text-gray-400 uppercase mb-2">Grouped by: {cluster.type} ({cluster.value})</div>
                <div className="flex flex-wrap gap-4">
                  {cluster.patients.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-50 hover:border-orange-200 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                        {p.full_name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <div className="text-sm font-bold text-gray-900">{p.full_name}</div>
                          {p.is_new && (
                            <span className="px-1 py-0.5 text-[8px] font-black bg-blue-600 text-white rounded leading-none uppercase tracking-wider">NEW</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{p.patient_id} • {p.phone || 'No phone'}</div>
                      </div>
                      <button 
                        onClick={() => setMergeTarget(p)}
                        className="ml-2 p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-transparent hover:border-orange-200"
                        title="Start Merge"
                      >
                        <GitMerge className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        {loading ? <Spinner /> : patients.length === 0 ? (
          <EmptyState message="No patients found" icon={Users} />
        ) : (
          <div className="min-h-[450px]">
            <Table headers={['Patient ID', 'Name', 'Gender', 'Phone', 'Status', 'Consent', 'Registered', 'Actions']}>
            {patients.map(p => {
              const statusCfg = getStatusConfig(p.status || 'ACTIVE');
              return (
                <tr key={p.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors">
                  <td className="table-cell font-mono text-[10px] text-blue-600 font-bold bg-blue-50/30 px-3 rounded-md">{p.patient_id}</td>
                  <td className="table-cell py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{p.full_name}</span>
                      {p.is_new && (
                        <span className="px-1.5 py-0.5 text-[9px] font-black bg-blue-600 text-white rounded-md tracking-tighter uppercase animate-pulse">NEW</span>
                      )}
                      {!p.has_treatment_consent && (
                        <AlertCircle className="w-4 h-4 text-amber-500" title="Missing Treatment Consent" />
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="text-xs text-gray-500 font-medium">{p.gender} • {p.age} yrs</span>
                  </td>
                  <td className="table-cell font-medium text-gray-600">{p.phone}</td>
                  <td className="table-cell">
                    <div className="relative min-w-[80px]">
                      <button 
                        onClick={() => setStatusMenuId(statusMenuId === p.id ? null : p.id)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset transition-all active:scale-95 ${statusCfg.bg} ${statusCfg.text} ring-black/5 cursor-pointer whitespace-nowrap`}
                      >
                        {statusCfg.label}
                      </button>
                      
                      {canEdit && statusMenuId === p.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setStatusMenuId(null)}
                          />
                          <div className="absolute top-1/2 -translate-y-1/2 left-0 z-50 bg-white shadow-2xl border border-gray-100 rounded-xl p-0.5 flex items-center gap-0.5 animate-in fade-in zoom-in-95 duration-100 ring-4 ring-white">
                            {[
                              { id: 'ACTIVE', label: 'Active', color: 'text-emerald-600', bg: 'hover:bg-emerald-50' },
                              { id: 'TRANSFERRED', label: 'Transferred', color: 'text-blue-600', bg: 'hover:bg-blue-50' },
                              { id: 'DECEASED', label: 'Deceased', color: 'text-red-600', bg: 'hover:bg-red-50' }
                            ].map(st => (
                              <button
                                key={st.id}
                                onClick={() => {
                                  handleStatusChange(p, st.id);
                                  setStatusMenuId(null);
                                }}
                                className={`px-2 py-1 text-[10px] font-black ${st.color} ${st.bg} rounded-lg transition-colors whitespace-nowrap`}
                              >
                                {st.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="relative min-w-[100px]">
                      <button 
                        onClick={() => setConsentMenuId(consentMenuId === p.id ? null : p.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ring-1 ring-inset transition-all active:scale-95 ${p.has_treatment_consent ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-amber-50 text-amber-700 ring-amber-100'}`}
                      >
                        {p.has_treatment_consent ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {p.has_treatment_consent ? 'Granted' : 'Missing'}
                      </button>

                      {consentMenuId === p.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setConsentMenuId(null)} />
                          <div className="absolute top-1/2 -translate-y-1/2 left-0 z-50 bg-white shadow-2xl border border-gray-100 rounded-xl p-0.5 flex items-center gap-0.5 animate-in fade-in zoom-in-95 duration-100 ring-4 ring-white">
                            <button
                              onClick={() => { setConsentPatient(p); setConsentMenuId(null); }}
                              className="px-2 py-1 text-[10px] font-black text-blue-600 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
                            >
                              Manager
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await patientsAPI.createConsent(p.id, { 
                                    consent_type: 'TREATMENT', 
                                    is_signed: true, 
                                    signer_name: p.full_name,
                                    status: 'GRANTED'
                                  });
                                  toast.success('Treatment consent granted');
                                  loadPatients();
                                } catch { toast.error('Failed to update consent'); }
                                setConsentMenuId(null);
                              }}
                              className="px-2 py-1 text-[10px] font-black text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors whitespace-nowrap"
                            >
                              Quick Grant
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-700">{new Date(p.created_at).toLocaleDateString()}</span>
                      <span className="text-[10px] text-gray-400 font-medium">{new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                <td className="table-cell">
                  <div className="relative flex items-center justify-end gap-1">
                    <Link to={`/patients/${p.id}/edit`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Patient">
                      <Edit2 className="w-4 h-4" />
                    </Link>

                    <Link to={`/patients/${p.id}/documents`} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Documents/X-rays">
                      <FileImage className="w-4 h-4" />
                    </Link>

                    <button 
                      onClick={() => setActionMenuId(actionMenuId === p.id ? null : p.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {actionMenuId === p.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActionMenuId(null)} />
                        <div className="absolute right-10 top-1/2 -translate-y-1/2 z-50 bg-white shadow-2xl border border-gray-100 rounded-xl p-1 flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-100 ring-2 ring-white">
                          <button onClick={() => { setConsentPatient(p); setActionMenuId(null); }} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Consent Manager">
                            <FileSignature className="w-4 h-4" />
                          </button>

                          {canEdit && (
                            <button onClick={() => { setMergeTarget(p); setActionMenuId(null); }} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Consolidate/Merge">
                              <GitMerge className="w-4 h-4" />
                            </button>
                          )}

                          <button onClick={() => { handleExport(p); setActionMenuId(null); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Export FHIR">
                            <Download className="w-4 h-4" />
                          </button>
                          
                          <div className="w-px h-4 bg-gray-100 mx-1" />

                          <button onClick={() => { setDeleteTarget(p); setActionMenuId(null); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete record">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          </Table>
          </div>
        )}
      </div>

      <MergePatientDialog 
        isOpen={!!mergeTarget} 
        onClose={() => setMergeTarget(null)} 
        primaryPatient={mergeTarget} 
        onMerged={loadPatients} 
      />

      <HistoryImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={loadPatients}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Patient"
        message={`Are you sure you want to delete ${deleteTarget?.full_name}? This action cannot be undone.`}
      />

      <ConsentManagerModal
        isOpen={!!consentPatient}
        onClose={() => setConsentPatient(null)}
        patient={consentPatient}
      />
    </div>
  );
}
