import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { patientsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Table, Spinner, EmptyState, ConfirmDialog, StatusBadge } from '../components/UI';
import AdvancedSearch from '../components/AdvancedSearch';
import MergePatientDialog from '../components/MergePatientDialog';
import { UserPlus, Edit2, Trash2, Eye, Users, FileImage, GitMerge, SearchCode } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Patients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ search: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [duplicateClusters, setDuplicateClusters] = useState([]);
  const [findingDuplicates, setFindingDuplicates] = useState(false);
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

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} total`}
        action={canEdit && (
          <div className="flex gap-2">
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
                        <div className="text-sm font-bold text-gray-900">{p.full_name}</div>
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
          <Table headers={['Patient ID', 'Name', 'Gender', 'Age', 'Phone', 'Blood Group', 'Registered', 'Actions']}>
            {patients.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="table-cell font-mono text-xs text-blue-600 font-medium">{p.patient_id}</td>
                <td className="table-cell font-medium">{p.full_name}</td>
                <td className="table-cell">{p.gender}</td>
                <td className="table-cell">{p.age} yrs</td>
                <td className="table-cell">{p.phone}</td>
                <td className="table-cell">
                  <span className="badge-blue">{p.blood_group}</span>
                </td>
                <td className="table-cell text-gray-400 text-xs">
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <Link to={`/patients/${p.id}/documents`} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Documents">
                      <FileImage className="w-4 h-4" />
                    </Link>
                    {canEdit && (
                      <Link to={`/patients/${p.id}/edit`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </Link>
                    )}
                    {canEdit && (
                      <button onClick={() => setMergeTarget(p)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg" title="Consolidate/Merge">
                        <GitMerge className="w-4 h-4" />
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      <MergePatientDialog 
        isOpen={!!mergeTarget} 
        onClose={() => setMergeTarget(null)} 
        primaryPatient={mergeTarget} 
        onMerged={loadPatients} 
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Patient"
        message={`Are you sure you want to delete ${deleteTarget?.full_name}? This action cannot be undone.`}
      />
    </div>
  );
}
