import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientsAPI, patientDocumentsAPI } from '../services/api';
import { PageHeader, Spinner, EmptyState, ConfirmDialog } from '../components/UI';
import { 
  ArrowLeft, Upload, FileImage, FileText, Trash2, Download, 
  Eye, X, Plus, File, Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

const DOCUMENT_TYPE_ICONS = {
  XRAY: FileImage,
  CT_SCAN: FileImage,
  MRI: FileImage,
  LAB_REPORT: FileText,
  PRESCRIPTION: FileText,
  CONSENT: FileText,
  INSURANCE: FileText,
  PHOTO: ImageIcon,
  OTHER: File,
};

export default function PatientDocuments() {
  const { id: patientId } = useParams();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    document_type: 'XRAY',
    title: '',
    description: '',
    file: null,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [patientRes, docsRes, typesRes] = await Promise.all([
        patientsAPI.get(patientId),
        patientDocumentsAPI.listByPatient(patientId),
        patientDocumentsAPI.getTypes(),
      ]);
      setPatient(patientRes.data);
      setDocuments(docsRes.data.results || docsRes.data);
      setDocumentTypes(typesRes.data);
    } catch (err) {
      toast.error('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Auto-set title from filename if empty
      if (!uploadForm.title) {
        const name = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        setUploadForm(f => ({ ...f, file, title: name }));
      } else {
        setUploadForm(f => ({ ...f, file }));
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      toast.error('Please select a file');
      return;
    }
    if (!uploadForm.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('patient', patientId);
      formData.append('document_type', uploadForm.document_type);
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('file', uploadForm.file);

      await patientDocumentsAPI.upload(formData);
      toast.success('Document uploaded successfully');
      setShowUpload(false);
      setUploadForm({ document_type: 'XRAY', title: '', description: '', file: null });
      loadData();
    } catch (err) {
      const msg = err.response?.data?.file?.[0] || err.response?.data?.detail || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await patientDocumentsAPI.delete(deleteTarget.id);
      toast.success('Document deleted');
      setDeleteTarget(null);
      loadData();
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return <Spinner />;
  if (!patient) return <EmptyState message="Patient not found" />;

  return (
    <div>
      <PageHeader
        title={`Documents: ${patient.first_name} ${patient.last_name}`}
        subtitle={`Patient ID: ${patient.patient_id} • ${documents.length} documents`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/patients/${patientId}/edit`)}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Patient
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Upload Document
            </button>
          </div>
        }
      />

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Upload Document</h2>
              <button onClick={() => setShowUpload(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                <select
                  value={uploadForm.document_type}
                  onChange={(e) => setUploadForm(f => ({ ...f, document_type: e.target.value }))}
                  className="input-field"
                >
                  {documentTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(f => ({ ...f, title: e.target.value }))}
                  className="input-field"
                  placeholder="e.g., Full Mouth X-Ray - January 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(f => ({ ...f, description: e.target.value }))}
                  className="input-field"
                  rows={2}
                  placeholder="Optional notes about this document..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.dicom,.dcm"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {uploadForm.file ? (
                      <div className="text-sm">
                        <FileImage className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                        <p className="font-medium text-gray-900">{uploadForm.file.name}</p>
                        <p className="text-gray-500">{formatFileSize(uploadForm.file.size)}</p>
                      </div>
                    ) : (
                      <div>
                        <Plus className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to select file</p>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF, DICOM (max 10MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-primary flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <span className="animate-spin">⏳</span> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Upload
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Grid */}
      <div className="card">
        {documents.length === 0 ? (
          <EmptyState 
            message="No documents uploaded yet" 
            icon={FileImage}
            action={
              <button onClick={() => setShowUpload(true)} className="btn-primary mt-4">
                <Upload className="w-4 h-4 mr-2" /> Upload First Document
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map(doc => {
              const Icon = DOCUMENT_TYPE_ICONS[doc.document_type] || File;
              return (
                <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                      {doc.document_type_display}
                    </span>
                  </div>
                  
                  <h3 className="font-medium text-gray-900 truncate" title={doc.title}>
                    {doc.title}
                  </h3>
                  {doc.description && (
                    <p className="text-sm text-gray-500 truncate mt-1" title={doc.description}>
                      {doc.description}
                    </p>
                  )}
                  
                  <div className="text-xs text-gray-400 mt-2 space-y-1">
                    <p>{formatFileSize(doc.file_size)}</p>
                    <p>{new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    {doc.is_image && (
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="flex-1 btn-secondary text-xs py-1.5"
                      >
                        <Eye className="w-3 h-3 mr-1" /> View
                      </button>
                    )}
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn-secondary text-xs py-1.5 text-center"
                    >
                      <Download className="w-3 h-3 mr-1 inline" /> Download
                    </a>
                    <button
                      onClick={() => setDeleteTarget(doc)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewDoc && previewDoc.is_image && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setPreviewDoc(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={previewDoc.file_url}
              alt={previewDoc.title}
              className="max-h-[80vh] mx-auto rounded-lg"
            />
            <p className="text-white text-center mt-4">{previewDoc.title}</p>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
      />
    </div>
  );
}
