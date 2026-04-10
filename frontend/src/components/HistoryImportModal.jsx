import { useState } from 'react';
import { patientsAPI } from '../services/api';
import { Modal, Spinner } from './UI';
import { Upload, FileJson, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HistoryImportModal({ isOpen, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const isJson = selectedFile.type === 'application/json' || selectedFile.name.endsWith('.json');
      if (isJson) {
        setFile(selectedFile);
      } else {
        toast.error('Please select a valid JSON file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await patientsAPI.importFHIR(file);
      setResult(data);
      toast.success('Patient history imported successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed. Check file format.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    if (result) onImported();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Medical History (FHIR Standard)" size="md">
      {!result ? (
        <div className="space-y-6">
          <div className="relative p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 py-10">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">Choose a FHIR JSON file</p>
              <p className="text-xs text-gray-500 mt-1">Maximum size: 5MB</p>
            </div>
            <input 
              type="file" 
              accept=".json" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {file && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <FileJson className="w-8 h-8 text-blue-600" />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-blue-900 truncate">{file.name}</p>
                <p className="text-xs text-blue-600">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800">
              Importing will create a new patient record. Ensure the JSON follows the FHIR Bundle standard.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={handleClose} className="btn-secondary">Cancel</button>
            <button 
              onClick={handleUpload} 
              disabled={!file || uploading} 
              className="btn-primary flex items-center gap-2"
            >
              {uploading && <Spinner className="w-4 h-4 p-0 shrink-0" />}
              Start Import
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 py-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Import Complete</h3>
            <p className="text-sm text-gray-500 mt-1">
              Patient <span className="font-semibold text-blue-600">{result.patient_id}</span> has been successfully created with history.
            </p>
          </div>
          <button onClick={handleClose} className="btn-primary w-full">View Patients</button>
        </div>
      )}
    </Modal>
  );
}
