import React, { forwardRef } from 'react';

const ClinicalSummaryReport = forwardRef(({ record, patient, clinic }, ref) => {
  if (!record || !patient) return null;

  return (
    <div ref={ref} className="p-10 bg-white text-gray-900 clinical-report">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-blue-800">{clinic?.clinic_name || 'Medical Center'}</h1>
          <p className="text-gray-500">{clinic?.address || ''}</p>
          <p className="text-gray-500">Phone: {clinic?.phone || ''}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold uppercase tracking-widest text-gray-400">Clinical Summary</h2>
          <p className="text-sm">Date: {new Date(record.created_at).toLocaleDateString()}</p>
          <p className="text-sm">Record ID: {record.id}</p>
        </div>
      </div>

      {/* Patient Info */}
      <div className="grid grid-cols-2 gap-8 mb-10 bg-gray-50 p-6 rounded-xl border border-gray-100">
        <div>
          <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">Patient Details</h3>
          <p className="font-bold text-lg">{patient.full_name}</p>
          <p className="text-sm text-gray-600">ID: {patient.patient_id}</p>
          <p className="text-sm text-gray-600">Age: {record.patient_age || patient.age} | Gender: {patient.gender}</p>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">Attending Doctor</h3>
          <p className="font-bold text-lg">Dr. {record.doctor_name}</p>
          <p className="text-sm text-gray-600">{record.next_visit_date ? `Next Visit: ${new Date(record.next_visit_date).toLocaleDateString()}` : ''}</p>
        </div>
      </div>

      {/* Clinical Body */}
      <div className="space-y-8">
        <section>
          <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-blue-100 mb-3 pb-1">Diagnosis</h3>
          <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">{record.diagnosis}</div>
        </section>

        <section>
          <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-blue-100 mb-3 pb-1">Treatment Plan</h3>
          <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">{record.treatment_plan_summary || 'N/A'}</div>
        </section>

        <section>
          <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-blue-100 mb-3 pb-1">Prescription / Procedures</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-1">Medications</h4>
              <div className="text-sm text-gray-700 whitespace-pre-wrap italic">{record.prescription || 'No medications prescribed.'}</div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-1">Procedures Done</h4>
              <div className="text-sm text-gray-700 whitespace-pre-wrap italic">{record.procedures_done || 'No procedures listed.'}</div>
            </div>
          </div>
        </section>

        {/* Notes Timeline */}
        {record.notes?.length > 0 && (
          <section>
            <h3 className="text-sm font-bold uppercase text-blue-600 border-b border-blue-100 mb-3 pb-1">Progress Notes</h3>
            <div className="space-y-4">
              {record.notes.map((note, idx) => (
                <div key={note.id} className="text-sm border-l-2 border-gray-200 pl-4 py-1">
                  <div className="flex justify-between text-[10px] text-gray-400 font-bold mb-1">
                    <span>{note.author_name}</span>
                    <span>{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap">{note.content}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Signature Section */}
      <div className="mt-20 flex justify-end">
        <div className="text-center w-64 border-t border-gray-300 pt-4">
          {record.is_signed ? (
            <>
              <p className="text-blue-700 font-bold italic mb-1 uppercase tracking-tighter">Authorized Digitally</p>
              <p className="font-bold text-gray-900">Dr. {record.signed_by_name}</p>
              <p className="text-[10px] text-gray-400">Signed on {new Date(record.signed_at).toLocaleString()}</p>
            </>
          ) : (
            <p className="text-gray-300 italic pt-4">Requires Digital Signature</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-20 pt-8 border-t border-gray-100 text-[10px] text-gray-400 text-center">
        This is a digitally generated clinical summary from DMS TRESVANCE.
      </div>
    </div>
  );
});

ClinicalSummaryReport.displayName = 'ClinicalSummaryReport';
export default ClinicalSummaryReport;
