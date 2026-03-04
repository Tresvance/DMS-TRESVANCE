import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supportAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/UI';
import {
  ArrowLeft, Send, UserCheck, RefreshCw,
  Paperclip, Lock, MessageSquare, Clock, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRIORITY_COLOR = {
  Critical: 'text-red-600 bg-red-50 border-red-200',
  High:     'text-orange-600 bg-orange-50 border-orange-200',
  Medium:   'text-yellow-600 bg-yellow-50 border-yellow-200',
  Low:      'text-gray-600 bg-gray-50 border-gray-200',
};

const STATUS_COLOR = {
  'Open':        'bg-blue-100 text-blue-700',
  'In Progress': 'bg-purple-100 text-purple-700',
  'Waiting':     'bg-yellow-100 text-yellow-700',
  'Resolved':    'bg-green-100 text-green-700',
  'Closed':      'bg-gray-100 text-gray-600',
};

export default function TicketDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const bottomRef = useRef(null);

  const [ticket, setTicket]       = useState(null);
  const [agents, setAgents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [comment, setComment]     = useState('');
  const [isInternal, setInternal] = useState(false);
  const [sending, setSending]     = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedAgent, setAgent] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const isSuperAdmin    = user?.role === 'SUPER_ADMIN';
  const isSupportAgent  = user?.role === 'SUPPORT_AGENT';
  const isClinicUser    = ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTION'].includes(user?.role);

  const load = async () => {
    try {
      const { data } = await supportAPI.getTicket(id);
      setTicket(data);
      setNewStatus(data.status);
      if (isSuperAdmin) {
        const { data: ag } = await supportAPI.listAgents();
        setAgents(ag);
      }
    } catch { toast.error('Failed to load ticket'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.comments]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSending(true);
    try {
      await supportAPI.addComment(id, { message: comment, is_internal: isInternal });
      setComment('');
      setInternal(false);
      load();
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const handleAssign = async () => {
    if (!selectedAgent) { toast.error('Select an agent'); return; }
    setAssigning(true);
    try {
      await supportAPI.assignTicket(id, { assigned_to: selectedAgent });
      toast.success('Ticket assigned');
      load();
    } catch { toast.error('Assign failed'); }
    finally { setAssigning(false); }
  };

  const handleStatusChange = async (s) => {
    try {
      await supportAPI.updateStatus(id, { status: s });
      toast.success(`Status updated to ${s}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  if (loading) return <Spinner />;
  if (!ticket) return <div className="text-center py-12 text-gray-400">Ticket not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/support/tickets')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-blue-600 font-bold">{ticket.ticket_number}</span>
            <span className={`badge border text-xs ${PRIORITY_COLOR[ticket.priority]}`}>
              {ticket.priority}
            </span>
            <span className={`badge text-xs ${STATUS_COLOR[ticket.status]}`}>
              {ticket.status}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">{ticket.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main - description + comments */}
        <div className="lg:col-span-2 space-y-4">

          {/* Description */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {ticket.raised_by_name?.[0]}
              </div>
              <div>
                <span className="text-sm font-medium">{ticket.raised_by_name}</span>
                <span className="text-xs text-gray-400 ml-2">
                  {new Date(ticket.created_at).toLocaleString()}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Comments thread */}
          <div className="space-y-3">
            {ticket.comments?.map(c => (
              <div key={c.id}
                className={`card ${c.is_internal ? 'bg-yellow-50 border-yellow-200' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold
                    ${['SUPER_ADMIN','SUPPORT_AGENT'].includes(c.author_role) ? 'bg-purple-600' : 'bg-blue-600'}`}>
                    {c.author_name?.[0]}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">{c.author_name}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  {c.is_internal && (
                    <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" /> Internal
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap ml-9">{c.message}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Reply box - not for closed tickets */}
          {ticket.status !== 'Closed' && (
            <div className="card">
              <form onSubmit={handleComment} className="space-y-3">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Write a reply..."
                />
                <div className="flex items-center justify-between">
                  {(isSuperAdmin || isSupportAgent) && (
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={e => setInternal(e.target.checked)}
                        className="rounded"
                      />
                      <Lock className="w-3.5 h-3.5" /> Internal note
                    </label>
                  )}
                  <div className="ml-auto">
                    <button type="submit" disabled={sending || !comment.trim()}
                      className="btn-primary flex items-center gap-2">
                      {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send Reply
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Sidebar - ticket info + actions */}
        <div className="space-y-4">

          {/* Ticket Info */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Ticket Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Clinic</dt>
                <dd className="font-medium">{ticket.clinic_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Category</dt>
                <dd><span className="badge-blue">{ticket.category}</span></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Raised by</dt>
                <dd className="font-medium">{ticket.raised_by_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Assigned to</dt>
                <dd className="font-medium">
                  {ticket.assigned_to_name || <span className="text-orange-500">Unassigned</span>}
                </dd>
              </div>
              {ticket.resolved_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Resolved</dt>
                  <dd className="text-xs">{new Date(ticket.resolved_at).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Update Status */}
          {(isSuperAdmin || isSupportAgent || (isClinicUser && ticket.status === 'Resolved')) && (
            <div className="card space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Update Status
              </h3>
              <div className="space-y-2">
                {(isSuperAdmin
                  ? ['Open','In Progress','Waiting','Resolved','Closed']
                  : isSupportAgent
                  ? ['In Progress','Waiting','Resolved']
                  : ['Closed']
                ).map(s => (
                  <button key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={ticket.status === s}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                      ${ticket.status === s
                        ? 'bg-blue-600 text-white font-medium'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assign Agent - Super Admin only */}
          {isSuperAdmin && (
            <div className="card space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> Assign Agent
              </h3>
              <select
                value={selectedAgent}
                onChange={e => setAgent(e.target.value)}
                className="input-field"
              >
                <option value="">Select agent</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name}</option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={assigning || !selectedAgent}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {assigning && <RefreshCw className="w-4 h-4 animate-spin" />}
                Assign
              </button>
            </div>
          )}

          {/* Clinic user close ticket after resolved */}
          {isClinicUser && ticket.status === 'Resolved' && (
            <div className="card bg-green-50 border-green-200 space-y-3">
              <p className="text-sm text-green-700 font-medium">Issue resolved?</p>
              <p className="text-xs text-green-600">If your issue is fully resolved, close this ticket.</p>
              <button
                onClick={() => handleStatusChange('Closed')}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                Close Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
