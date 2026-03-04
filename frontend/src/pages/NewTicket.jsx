import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportAPI } from '../services/api';
import { FormField } from '../components/UI';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL = { title: '', description: '', category: 'General', priority: 'Medium' };

export default function NewTicket() {
  const navigate = useNavigate();
  const [form, setForm]     = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const fc = (f) => (e) => setForm(v => ({ ...v, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      toast.error('Title and description are required');
      return;
    }
    setLoading(true);
    try {
      const { data } = await supportAPI.createTicket(form);
      toast.success(`Ticket ${data.ticket_number} raised successfully!`);
      navigate('/support/tickets');
    } catch { toast.error('Failed to create ticket'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/support/tickets')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raise Support Ticket</h1>
          <p className="text-sm text-gray-500">Describe your issue and our team will assist you</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card space-y-4">
          <FormField label="Title" required>
            <input
              value={form.title} onChange={fc('title')}
              className="input-field" placeholder="Brief title of your issue"
            />
          </FormField>

          <FormField label="Description" required>
            <textarea
              value={form.description} onChange={fc('description')}
              className="input-field" rows={5}
              placeholder="Describe your issue in detail..."
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category">
              <select value={form.category} onChange={fc('category')} className="input-field">
                <option value="General">General</option>
                <option value="Billing">Billing</option>
                <option value="Technical">Technical</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Complaint">Complaint</option>
                <option value="Other">Other</option>
              </select>
            </FormField>

            <FormField label="Priority">
              <select value={form.priority} onChange={fc('priority')} className="input-field">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </FormField>
          </div>
        </div>

        {/* Priority guide */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-medium text-blue-700 mb-2">Priority Guide</p>
          <div className="grid grid-cols-2 gap-1 text-xs text-blue-600">
            <span><strong>Low</strong> — General queries</span>
            <span><strong>Medium</strong> — Minor issues</span>
            <span><strong>High</strong> — Affecting operations</span>
            <span><strong>Critical</strong> — System down / data loss</span>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/support/tickets')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Ticket
          </button>
        </div>
      </form>
    </div>
  );
}
