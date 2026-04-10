import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientsAPI, patientDocumentsAPI } from '../services/api';
import { PageHeader, Spinner, EmptyState, ConfirmDialog } from '../components/UI';
import { 
  ArrowLeft, Upload, FileImage, FileText, Trash2, Download, 
  Eye, X, Plus, File, Image as ImageIcon, Search, Filter, 
  Maximize2, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight,
  AlertCircle
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
  const [isDragging, setIsDragging] = useState(false);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Viewer States
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const imgRef = useRef(null);

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
      toast.error('Failed to load clinical records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFiles = async (files) => {
    if (!files.length) return;
    
    setUploading(true);
    const toastId = toast.loading(`Uploading ${files.length} document(s)...`);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('patient', patientId);
        formData.append('document_type', 'XRAY'); // Default to X-Ray
        formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
        formData.append('description', 'Batch uploaded');
        formData.append('file', file);

        await patientDocumentsAPI.upload(formData);
      }
      toast.success('All documents uploaded successfully', { id: toastId });
      loadData();
    } catch (err) {
      toast.error('Some uploads failed', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleDelete = async () => {
    try {
      await patientDocumentsAPI.delete(deleteTarget.id);
      toast.success('Record purged');
      setDeleteTarget(null);
      loadData();
    } catch {
      toast.error('Deletion failed');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Lightbox Zoom Logic
  const handleZoom = (delta) => setZoom(prev => Math.min(Math.max(0.5, prev + delta), 4));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const resetViewer = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const filteredDocs = documents.filter(doc => {
    const matchesQuery = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'ALL' || doc.document_type === filterType;
    return matchesQuery && matchesFilter;
  });

  if (loading) return <Spinner />;
  if (!patient) return <EmptyState message="Diagnostic vault unreachable" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Clinical Diagnostics: ${patient.first_name} ${patient.last_name}`}
        subtitle={`${patient.patient_id} • ${documents.length} Records found`}
        action={
          <button
            onClick={() => navigate(`/patients/${patientId}/edit`)}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Patient File
          </button>
        }
      />

      {/* Advanced Quick-Drop Zone */}
      <div 
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center min-h-[200px] ${
          isDragging 
          ? 'border-blue-500 bg-blue-50/50 scale-[1.01] shadow-lg' 
          : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-gray-50/50'
        }`}
      >
        <div className={`p-4 rounded-full mb-4 ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
          <Upload className={`w-8 h-8 ${isDragging ? 'animate-bounce' : ''}`} />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Diagnostic Data Portal</h3>
        <p className="text-sm text-gray-500 mt-1">Drag radiographs, scans or reports here to sync with patient file</p>
        <p className="text-[10px] text-gray-400 mt-2 uppercase font-black tracking-widest">Supports JPG, PNG, PDF, DICOM • MAX 10MB</p>
        
        <input 
          type="file" 
          multiple 
          onChange={(e) => handleFiles(Array.from(e.target.files))}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        
        {uploading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-10">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-blue-600 font-bold animate-pulse">TRANSMITTING DATA...</p>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search diagnostics..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-lg text-sm transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-gray-50 border-transparent rounded-lg text-sm font-bold text-gray-700 py-2 focus:ring-4 focus:ring-blue-100"
            >
              <option value="ALL">ALL TYPES</option>
              {documentTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            GRID
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            LIST
          </button>
        </div>
      </div>

      {/* Results */}
      {filteredDocs.length === 0 ? (
        <div className="card py-20">
          <EmptyState 
            message={searchQuery ? "No records match your query" : "No diagnostics found"} 
            icon={Search}
          />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredDocs.map(doc => {
            const Icon = DOCUMENT_TYPE_ICONS[doc.document_type] || File;
            return (
              <div 
                key={doc.id} 
                className="group relative bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                {/* Thumbnail/Preview */}
                <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden relative">
                  {doc.is_image ? (
                    <img 
                      src={doc.file_url} 
                      alt={doc.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <Icon className="w-12 h-12 text-gray-200" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <div className="flex gap-2 w-full">
                      {doc.is_image ? (
                        <button 
                          onClick={() => { resetViewer(); setPreviewDoc(doc); }}
                          className="flex-1 bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-blue-600 p-2 rounded-lg transition-all"
                        >
                          <Maximize2 className="w-4 h-4 mx-auto" />
                        </button>
                      ) : null}
                      <a 
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-blue-600 p-2 rounded-lg transition-all"
                      >
                        <Download className="w-4 h-4 mx-auto" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`p-1 rounded ${doc.is_image ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{doc.document_type_display}</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 truncate" title={doc.title}>{doc.title}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-400 font-mono">{formatFileSize(doc.file_size)}</span>
                    <button 
                      onClick={() => setDeleteTarget(doc)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase">Diagnostic Type</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase">Label</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase">Data Size</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase">Created At</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-white">
                        {(() => {
                          const Icon = DOCUMENT_TYPE_ICONS[doc.document_type] || File;
                          return <Icon className="w-5 h-5 text-gray-400" />;
                        })()}
                      </div>
                      <span className="text-xs font-bold text-gray-700">{doc.document_type_display}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">{doc.title}</span>
                      <span className="text-xs text-gray-400">{doc.description || 'No description'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-500">{formatFileSize(doc.file_size)}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {doc.is_image && (
                        <button onClick={() => { resetViewer(); setPreviewDoc(doc); }} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-lg transition-all">
                        <Download className="w-4 h-4" />
                      </a>
                      <button onClick={() => setDeleteTarget(doc)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Advanced Diagnostic X-Ray Viewer (Lightbox) */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex flex-col z-[60] animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FileImage className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">{previewDoc.title}</h2>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <span className="font-mono uppercase tracking-widest">{previewDoc.document_type_display}</span>
                  <span>•</span>
                  <span>{formatFileSize(previewDoc.file_size)}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-500" /> DISP: DIAGNOSTIC ONLY</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setPreviewDoc(null)}
              className="p-3 bg-white/10 hover:bg-red-500 text-white rounded-full transition-all group"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          {/* Main Stage */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
            <div 
              className="relative transition-transform duration-200 cursor-move"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) translate(${pan.x}px, ${pan.y}px)`,
              }}
              onMouseDown={() => setIsPanning(true)}
              onMouseMove={(e) => {
                if (isPanning) {
                  setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
                }
              }}
              onMouseUp={() => setIsPanning(false)}
              onMouseLeave={() => setIsPanning(false)}
            >
              <img 
                ref={imgRef}
                src={previewDoc.file_url} 
                alt={previewDoc.title}
                className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl rounded"
                draggable={false}
              />
            </div>

            {/* Viewer Controls - Floating HUD */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 backdrop-blur-2xl p-2 rounded-2xl border border-white/10 shadow-2xl">
              <button 
                onClick={() => handleZoom(-0.2)} 
                title="Zoom Out"
                className="p-3 hover:bg-white/10 text-white rounded-xl transition-all"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <div className="px-4 text-white font-mono font-bold border-x border-white/5">
                {(zoom * 100).toFixed(0)}%
              </div>
              <button 
                onClick={() => handleZoom(0.2)} 
                title="Zoom In"
                className="p-3 hover:bg-white/10 text-white rounded-xl transition-all"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button 
                onClick={handleRotate} 
                title="Rotate 90deg"
                className="p-3 hover:bg-white/10 text-white rounded-xl transition-all"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <button 
                onClick={resetViewer} 
                title="Reset View"
                className="p-3 hover:bg-white/10 text-white rounded-xl transition-all"
              >
                <Filter className="w-5 h-5" />
              </button>
              <div className="w-px h-8 bg-white/5 mx-1"></div>
              <a 
                href={previewDoc.file_url} 
                download
                className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg transition-all"
              >
                <Download className="w-5 h-5" />
              </a>
            </div>
            
            {/* Quick Helper */}
            <div className="absolute top-10 right-10 text-white/30 text-[10px] font-black uppercase tracking-[0.2em] pointer-events-none">
              CTRL + SCROLL TO ZOOM • DRAG TO PAN
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Sanitize Record"
        message={`Are you sure you want to permanently purge "${deleteTarget?.title}"? This action is audited and irreversible.`}
      />
    </div>
  );
}
