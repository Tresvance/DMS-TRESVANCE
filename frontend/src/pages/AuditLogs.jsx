import { useState, useEffect } from 'react';
import { auditLogsAPI } from '../services/api';
import { PageHeader } from '../components/UI';
import { Shield, User, Clock, AlertTriangle, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await auditLogsAPI.list();
      setLogs(res.data.results || res.data);
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><Shield className="w-3 h-3 mr-1"/> Success</span>;
      case 'LOGIN_FAILED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1"/> Failed</span>;
      case 'PERMISSION_CHANGE':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Permission</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{action}</span>;
    }
  };

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      render: (log) => (
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="w-4 h-4 mr-2 text-gray-400" />
          {new Date(log.timestamp).toLocaleString()}
        </div>
      )
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (log) => getActionBadge(log.action)
    },
    {
      header: 'User',
      accessor: 'user_name',
      render: (log) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 flex items-center">
            <User className="w-4 h-4 mr-1 text-gray-400" />
            {log.user_name || 'System / Unknown'}
          </span>
        </div>
      )
    },
    {
      header: 'IP Address',
      accessor: 'ip_address',
      render: (log) => (
        <div className="flex items-center text-sm text-gray-600 font-mono">
          <Monitor className="w-4 h-4 mr-2 text-gray-400" />
          {log.ip_address || 'N/A'}
        </div>
      )
    },
    {
      header: 'Details',
      accessor: 'description',
      render: (log) => (
        <span className="text-sm text-gray-500 line-clamp-2" title={log.description}>
          {log.description}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Audit Logs" 
        subtitle="Monitor system access and security events" 
        action={
          <button 
            onClick={fetchLogs} 
            className="px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 transition-colors flex items-center"
          >
            Refresh
          </button>
        }
      />
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No audit logs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col, i) => (
                    <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log, rowIdx) => (
                  <tr key={log.id || rowIdx} className="hover:bg-gray-50">
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className="px-6 py-4 whitespace-nowrap">
                        {col.render(log)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
