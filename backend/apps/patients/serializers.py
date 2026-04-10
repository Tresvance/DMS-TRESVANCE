from rest_framework import serializers
from .models import Patient, PatientDocument


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    clinic_name = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            'id', 'clinic', 'clinic_name', 'patient_id', 'first_name', 'middle_name', 'last_name',
            'full_name', 'gender', 'date_of_birth', 'age', 'marital_status', 'occupation',
            'phone', 'email', 'preferred_contact_method',
            'address', 'city', 'pincode', 'blood_group', 'allergies', 'medical_history',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
            'insurance_provider', 'insurance_policy_number', 'insurance_coverage_details',
            'referring_source', 'status', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'patient_id', 'created_at','clinic']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_age(self, obj):
        return obj.age

    def get_clinic_name(self, obj):
        return obj.clinic.clinic_name if obj.clinic else None


class PatientListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = ['id', 'patient_id', 'full_name', 'gender', 'age', 'phone', 'blood_group', 'status', 'is_active', 'created_at']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_age(self, obj):
        return obj.age


class PatientDocumentSerializer(serializers.ModelSerializer):
    """Full serializer for document details"""
    patient_name = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()
    document_type_display = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = PatientDocument
        fields = [
            'id', 'patient', 'patient_name', 'document_type', 'document_type_display',
            'title', 'description', 'file', 'file_url', 'file_size', 'file_extension',
            'is_image', 'uploaded_by', 'uploaded_by_name', 'medical_record',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'file_size', 'uploaded_by', 'created_at', 'updated_at']

    def get_patient_name(self, obj):
        return obj.patient.get_full_name()

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() if obj.uploaded_by else None

    def get_document_type_display(self, obj):
        return obj.get_document_type_display()

    def get_file_url(self, obj):
        # Return relative URL - frontend proxy or nginx will handle it
        if obj.file:
            return obj.file.url  # Returns /media/patient_documents/...
        return None


class PatientDocumentUploadSerializer(serializers.ModelSerializer):
    """Simplified serializer for uploads"""
    class Meta:
        model = PatientDocument
        fields = ['patient', 'document_type', 'title', 'description', 'file', 'medical_record']

    def validate_file(self, value):
        # Max 10MB
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError('File size must be under 10MB.')
        
        # Allowed extensions
        allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'dicom', 'dcm']
        ext = value.name.split('.')[-1].lower()
        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f'File type .{ext} not allowed. Allowed: {", ".join(allowed_extensions)}'
            )
        return value
