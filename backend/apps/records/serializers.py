from rest_framework import serializers
from .models import MedicalRecord


class MedicalRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = MedicalRecord
        fields = [
            'id', 'clinic', 'patient', 'patient_name', 'doctor', 'doctor_name',
            'appointment', 'diagnosis', 'treatment_plan', 'prescription',
            'procedures_done', 'next_visit_date', 'attachments', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_patient_name(self, obj):
        return obj.patient.get_full_name()

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name()
