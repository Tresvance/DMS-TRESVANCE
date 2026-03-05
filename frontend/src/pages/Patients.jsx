import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { patientsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader, SearchBar, Table, Spinner, EmptyState, ConfirmDialog, StatusBadge } from '../components/UI';
import { UserPlus, Edit2, Trash2, Eye, Users, FileImage } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Patients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const canEdit = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTION'].includes(user?.role);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await patientsAPI.list({ search });
      setPatients(data.results || data);
    } catch { toast.error('Failed to load patients'); }
    finally { setLoading(false); }
  }, [search]);

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

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} total`}
        action={canEdit && (
          <Link to="/patients/new" className="btn-primary flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add Patient
          </Link>
        )}
      />

      <div className="card">
        <div className="flex items-center gap-4 mb-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, ID, phone..." />
        </div>

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
