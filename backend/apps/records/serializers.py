from rest_framework import serializers
from .models import MedicalRecord, ClinicalNote, ClinicalNoteVersion
from apps.clinics.models import Clinic
from apps.users.models import User


class ClinicalNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)

    class Meta:
        model = ClinicalNote
        fields = ['id', 'medical_record', 'author', 'author_name', 'content', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

class ClinicalNoteVersionSerializer(serializers.ModelSerializer):
    modified_by_name = serializers.CharField(source='modified_by.get_full_name', read_only=True)

    class Meta:
        model = ClinicalNoteVersion
        fields = ['id', 'note', 'content_snapshot', 'modified_by', 'modified_by_name', 'modified_at']
        read_only_fields = ['id', 'note', 'modified_at']


class MedicalRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    notes = ClinicalNoteSerializer(many=True, read_only=True)
    signed_by_name = serializers.CharField(source='signed_by.get_full_name', read_only=True)
    clinic = serializers.PrimaryKeyRelatedField(queryset=Clinic.objects.all(), required=False)
    doctor = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)

    class Meta:
        model = MedicalRecord
        fields = [
            'id', 'clinic', 'patient', 'patient_name', 'doctor', 'doctor_name',
            'appointment', 'diagnosis', 'treatment_plan', 'prescription',
            'procedures_done', 'periodontal_status', 'next_visit_date', 'attachments', 'notes', 
            'is_signed', 'signed_by', 'signed_by_name', 'signed_at', 'created_at'
        ]
        read_only_fields = ['id', 'is_signed', 'signed_by', 'signed_at', 'created_at']

    def get_patient_name(self, obj):
        return obj.patient.get_full_name()

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name()
