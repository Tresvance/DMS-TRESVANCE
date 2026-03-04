import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supportAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Table, Spinner, EmptyState, SearchBar, ConfirmDialog } from '../components/UI';
import { Plus, Eye, Trash2, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';

const PRIORITY_BADGE = {
  Critical: 'bg-red-100 text-red-700 border border-red-200',
  High:     'bg-orange-100 text-orange-700 border border-orange-200',
  Medium:   'bg-yellow-100 text-yellow-700 border border-yellow-200',
  Low:      'bg-gray-100 text-gray-600 border border-gray-200',
};

const STATUS_BADGE = {
  'Open':        'bg-blue-100 text-blue-700',
  'In Progress': 'bg-purple-100 text-purple-700',
  'Waiting':     'bg-yellow-100 text-yellow-700',
  'Resolved':    'bg-green-100 text-green-700',
  'Closed':      'bg-gray-100 text-gray-600',
};

export default function Tickets() {
  const { user }  = useAuth();
  const [tickets, setTickets]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]   = useState(false);

  const canCreate = ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTION'].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search };
      if (statusFilter) params.status = statusFilter;
      const { data } = await supportAPI.listTickets(params);
      setTickets(data.results || data);
    } catch { toast.error('Failed to load tickets'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await supportAPI.deleteTicket(deleteTarget.id);
      toast.success('Ticket deleted');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        subtitle={`${tickets.length} tickets`}
        action={canCreate && (
          <Link to="/support/tickets/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Raise Ticket
          </Link>
        )}
      />

      <div className="card">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <SearchBar value={search} onChange={setSearch} placeholder="Search tickets..." />
          <select
            value={statusFilter}
            onChange={e => setFilter(e.target.value)}
            className="input-field max-w-[160px]"
          >
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting">Waiting</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {loading ? <Spinner /> : tickets.length === 0 ? (
          <EmptyState message="No tickets found" icon={Ticket} />
        ) : (
          <Table headers={['Ticket #', 'Title', 'Category', 'Priority', 'Status',
            ...(user?.role !== 'SUPPORT_AGENT' ? ['Clinic'] : []),
            'Assigned To', 'Date', 'Actions']}>
            {tickets.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="table-cell font-mono text-xs text-blue-600 font-medium">
                  {t.ticket_number}
                </td>
                <td className="table-cell font-medium max-w-xs truncate">{t.title}</td>
                <td className="table-cell">
                  <span className="badge-blue">{t.category}</span>
                </td>
                <td className="table-cell">
                  <span className={`badge text-xs ${PRIORITY_BADGE[t.priority]}`}>
                    {t.priority}
                  </span>
                </td>
                <td className="table-cell">
                  <span className={`badge text-xs ${STATUS_BADGE[t.status]}`}>
                    {t.status}
                  </span>
                </td>
                {user?.role !== 'SUPPORT_AGENT' && (
                  <td className="table-cell text-gray-500">{t.clinic_name}</td>
                )}
                <td className="table-cell text-gray-500">
                  {t.assigned_to_name || <span className="text-orange-500 text-xs">Unassigned</span>}
                </td>
                <td className="table-cell text-xs text-gray-400">
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
                <td className="table-cell">
                  <div className="flex gap-2">
                    <Link to={`/support/tickets/${t.id}`}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="View">
                      <Eye className="w-4 h-4" />
                    </Link>
                    {user?.role === 'SUPER_ADMIN' && (
                      <button onClick={() => setDeleteTarget(t)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
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
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Delete Ticket"
        message={`Delete ticket ${deleteTarget?.ticket_number}? This cannot be undone.`}
      />
    </div>
  );
}
