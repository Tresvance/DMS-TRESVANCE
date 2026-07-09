import { useState, useEffect } from 'react';
import { clinicalNotesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Spinner, FormField } from './UI';
import { Save, Plus, Edit2, Trash2, History, MessageSquare, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClinicalNotesManager({ recordId, clinicId }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [versionsModal, setVersionsModal] = useState({ open: false, noteId: null, versions: [] });

  useEffect(() => {
    loadNotes();
  }, [recordId]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const res = await clinicalNotesAPI.listByRecord(recordId);
      setNotes(res.data.results || res.data);
    } catch (err) {
      toast.error('Failed to load notes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      await clinicalNotesAPI.create({
        medical_record: recordId,
        content: newNote
      });
      toast.success('Note added');
      setNewNote('');
      loadNotes();
    } catch (err) {
      toast.error('Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNote = async (id) => {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      await clinicalNotesAPI.update(id, { content: editContent });
      toast.success('Note updated');
      setEditingId(null);
      loadNotes();
    } catch (err) {
      toast.error('Failed to update note');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await clinicalNotesAPI.delete(id);
      toast.success('Note deleted');
      loadNotes();
    } catch (err) {
      toast.error('Failed to delete note');
    }
  };

  const handleViewVersions = async (id) => {
    try {
      const res = await clinicalNotesAPI.getVersions(id);
      setVersionsModal({ open: true, noteId: id, versions: res.data });
    } catch (err) {
      toast.error('Failed to load version history');
    }
  };

  if (loading) return <div className="p-8 text-center"><Spinner /></div>;

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No clinical notes recorded for this visit yet.</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                    {note.author_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{note.author_name}</h4>
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                      {new Date(note.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                {(user.id === note.author || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleViewVersions(note.id)}
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="View Edit History"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Note"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              
              {editingId === note.id ? (
                <div className="space-y-3 mt-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="input-field min-h-[100px] text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="btn-secondary py-1.5 px-3 text-xs">Cancel</button>
                    <button 
                      onClick={() => handleUpdateNote(note.id)} 
                      disabled={saving}
                      className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
                    >
                      {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed mt-2">{note.content}</p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="pt-4 border-t border-gray-100">
        <form onSubmit={handleAddNote} className="space-y-3">
          <FormField label="Append Clinical Note">
            <textarea
              placeholder="Type clinical observations, progress notes, or additional instructions..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="input-field min-h-[120px]"
            />
          </FormField>
          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={saving || !newNote.trim()} 
              className="btn-primary flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Append Note
            </button>
          </div>
        </form>
      </div>

      {/* Versions Modal Inline */}
      {versionsModal.open && (
        <div className="fixed inset-0 z-[60] bg-gray-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><History className="w-4 h-4 text-blue-600" /> Edit History</h3>
              <button onClick={() => setVersionsModal({ open: false, noteId: null, versions: [] })} className="text-gray-400 hover:text-gray-600 text-xl font-bold px-2">&times;</button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
              {versionsModal.versions.length === 0 ? (
                <div className="text-center text-gray-500 py-4">No previous versions found.</div>
              ) : (
                versionsModal.versions.map((v, i) => (
                  <div key={v.id} className="p-3 bg-gray-50 rounded border text-sm">
                    <div className="flex justify-between text-xs text-gray-500 mb-1 border-b pb-1">
                      <span className="font-semibold">Modified by {v.modified_by_name || 'Unknown'}</span>
                      <span>{new Date(v.modified_at).toLocaleString()}</span>
                    </div>
                    <div className="whitespace-pre-wrap text-gray-700 mt-2">{v.content_snapshot}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
