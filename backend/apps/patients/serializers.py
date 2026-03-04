from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    clinic_name = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            'id', 'clinic', 'clinic_name', 'patient_id', 'first_name', 'last_name',
            'full_name', 'gender', 'date_of_birth', 'age', 'phone', 'email',
            'address', 'blood_group', 'allergies', 'medical_history',
            'emergency_contact_name', 'emergency_contact_phone',
            'is_active', 'created_at'
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
        fields = ['id', 'patient_id', 'full_name', 'gender', 'age', 'phone', 'blood_group', 'created_at']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_age(self, obj):
        return obj.age
