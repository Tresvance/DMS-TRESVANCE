import json
from datetime import date, datetime
from django.utils import timezone
from apps.patients.models import Patient
from apps.records.models import MedicalRecord, ClinicalNote

class FHIRMapper:
    """Helper to convert DMS models to FHIR-style JSON and vice-versa."""
    
    @staticmethod
    def export_patient_bundle(patient):
        """Generates a FHIR Bundle (JSON) for a single patient's history."""
        bundle = {
            "resourceType": "Bundle",
            "type": "collection",
            "timestamp": timezone.now().isoformat(),
            "entry": []
        }
        
        # 1. Patient Resource
        p_data = {
            "resource": {
                "resourceType": "Patient",
                "id": str(patient.id),
                "identifier": [{"system": "dms-tresvance", "value": patient.patient_id}],
                "name": [{"text": patient.get_full_name(), "family": patient.last_name, "given": [patient.first_name]}],
                "gender": patient.gender.lower(),
                "birthDate": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                "telecom": [
                    {"system": "phone", "value": patient.phone},
                    {"system": "email", "value": patient.email}
                ],
                "address": [{"text": patient.address, "city": patient.city, "postalCode": patient.pincode}]
            }
        }
        bundle["entry"].append(p_data)
        
        # 2. Conditions (Medical Records)
        records = MedicalRecord.objects.filter(patient=patient)
        for record in records:
            c_data = {
                "resource": {
                    "resourceType": "Condition",
                    "id": f"rec-{record.id}",
                    "subject": {"reference": f"Patient/{patient.id}"},
                    "code": {"text": record.diagnosis},
                    "note": [
                        {"text": f"Treatment Plan: {record.treatment_plan}"},
                        {"text": f"Prescription: {record.prescription}"},
                        {"text": f"Procedures: {record.procedures_done}"}
                    ],
                    "recordedDate": record.created_at.isoformat()
                }
            }
            bundle["entry"].append(c_data)
            
            # 3. Observations (Clinical Notes for this record)
            notes = ClinicalNote.objects.filter(medical_record=record)
            for note in notes:
                n_data = {
                    "resource": {
                        "resourceType": "Observation",
                        "id": f"note-{note.id}",
                        "status": "final",
                        "code": {"text": "Clinical Note"},
                        "subject": {"reference": f"Patient/{patient.id}"},
                        "focus": [{"reference": f"Condition/rec-{record.id}"}],
                        "valueString": note.content,
                        "effectiveDateTime": note.created_at.isoformat(),
                        "performer": [{"display": note.author.get_full_name()}]
                    }
                }
                bundle["entry"].append(n_data)
                
        return bundle

    @staticmethod
    def import_patient_bundle(bundle_data, clinic):
        """Parses a FHIR Bundle and creates a new Patient with history."""
        # This is a simplified importer. It assumes the first Patient resource is the target.
        entries = bundle_data.get("entry", [])
        
        patient_resource = next((e["resource"] for e in entries if e["resource"]["resourceType"] == "Patient"), None)
        if not patient_resource:
            raise ValueError("No Patient resource found in Bundle")
            
        # Parse Patient
        name_obj = patient_resource.get("name", [{}])[0]
        full_name = name_obj.get("text", "")
        # Split name if text is missing
        first_name = name_obj.get("given", ["Unknown"])[0] if not full_name else full_name.split()[0]
        last_name = name_obj.get("family", "Imported") if not full_name else (full_name.split()[-1] if len(full_name.split()) > 1 else "")
        
        telecoms = patient_resource.get("telecom", [])
        phone = next((t["value"] for t in telecoms if t["system"] == "phone"), "0000000000")
        email = next((t["value"] for t in telecoms if t["system"] == "email"), "")
        
        address_obj = patient_resource.get("address", [{}])[0]
        
        patient = Patient.objects.create(
            clinic=clinic,
            first_name=first_name,
            last_name=last_name,
            gender=patient_resource.get("gender", "Other").capitalize(),
            date_of_birth=patient_resource.get("birthDate", "1990-01-01"),
            phone=phone,
            email=email,
            address=address_obj.get("text", ""),
            city=address_obj.get("city", ""),
            pincode=address_obj.get("postalCode", "")
        )
        
        # Map IDs to look up records during import
        record_map = {} # old_id -> new_obj
        
        # Parse Conditions (Records)
        for entry in entries:
            res = entry["resource"]
            if res["resourceType"] == "Condition":
                notes_text = " ".join([n.get("text", "") for n in res.get("note", [])])
                # Simple parsing of our internal format tags if present
                treatment = res.get("note", [{}])[0].get("text", "").replace("Treatment Plan: ", "") if len(res.get("note", [])) > 0 else ""
                
                record = MedicalRecord.objects.create(
                    clinic=clinic,
                    patient=patient,
                    doctor=clinic.users.filter(role='DOCTOR').first(), # Assign to first doctor found
                    diagnosis=res.get("code", {}).get("text", "Unknown Diagnosis"),
                    treatment_plan=treatment,
                    created_at=res.get("recordedDate", timezone.now().isoformat())
                )
                record_map[res.get("id")] = record
                
        # Parse Observations (Notes)
        for entry in entries:
            res = entry["resource"]
            if res["resourceType"] == "Observation" and res.get("valueString"):
                # Find linked record
                focus_ref = res.get("focus", [{}])[0].get("reference", "").replace("Condition/", "")
                linked_record = record_map.get(focus_ref)
                
                if linked_record:
                    ClinicalNote.objects.create(
                        medical_record=linked_record,
                        author=clinic.users.all().first(), # Assign to clinic admin or similar
                        content=res.get("valueString"),
                        created_at=res.get("effectiveDateTime", timezone.now().isoformat())
                    )
                    
        return patient
