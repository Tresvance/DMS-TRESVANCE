import { useState, useEffect, useCallback } from 'react';
import { appointmentsAPI } from '../services/api';
import { Spinner, EmptyState, StatusBadge } from './UI';
import { UserCheck, Clock, UserCog, UserCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import moment from 'moment';

export default function LiveQueue({ title = "Today's Live Queue" }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    try {
      const today = moment().format('YYYY-MM-DD');
      const { data } = await appointmentsAPI.list({ appointment_date: today });
      // Only keep Checked-In (and maybe In-Progress)
      const results = data.results || data;
      const activeQueue = results
        .filter(a => ['Checked-In', 'In-Progress'].includes(a.status))
        .sort((a, b) => {
          if (a.status === 'In-Progress' && b.status !== 'In-Progress') return -1;
          if (b.status === 'In-Progress' && a.status !== 'In-Progress') return 1;
          return new Date(a.arrival_time) - new Date(b.arrival_time);
        });
      setQueue(activeQueue);
    } catch {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    // Optionally poll every minute
    const interval = setInterval(loadQueue, 60000);
    return () => clearInterval(interval);
  }, [loadQueue]);

  const updateStatus = async (id, newStatus) => {
    try {
      await appointmentsAPI.patch(id, { status: newStatus });
      toast.success(`Patient marked as ${newStatus}`);
      loadQueue();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-600" />
          {title}
        </h3>
        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
          {queue.length} Waiting
        </span>
      </div>

      <div className="flex-1 overflow-auto -mx-4 px-4">
        {loading ? (
          <Spinner />
        ) : queue.length === 0 ? (
          <EmptyState 
            message="Queue is empty" 
            icon={UserCircle} 
            description="No patients are currently checked in or waiting."
          />
        ) : (
          <div className="space-y-3">
            {queue.map(appt => (
              <div key={appt.id} className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{appt.patient_name}</h4>
                    <p className="text-xs text-gray-500">Dr. {appt.doctor_name}</p>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
                
                <div className="flex justify-between items-end mt-3">
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 
                    Arrived: {appt.arrival_time ? moment(appt.arrival_time).format('hh:mm A') : 'Unknown'}
                  </div>
                  
                  {appt.status === 'Checked-In' && (
                    <button 
                      onClick={() => updateStatus(appt.id, 'In-Progress')}
                      className="text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded flex items-center gap-1"
                    >
                      <UserCog className="w-3 h-3" /> Send to Doctor
                    </button>
                  )}
                  {appt.status === 'In-Progress' && (
                    <button 
                      onClick={() => updateStatus(appt.id, 'Completed')}
                      className="text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 px-2 py-1 rounded flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" /> Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
