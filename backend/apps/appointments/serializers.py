from rest_framework import serializers
from .models import Appointment, TreatmentType, BlockTime, WaitlistEntry


class TreatmentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentType
        fields = '__all__'


class BlockTimeSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = BlockTime
        fields = ['id', 'doctor', 'doctor_name', 'start_datetime', 'end_datetime', 'reason']

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name() if obj.doctor else None


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name    = serializers.SerializerMethodField()
    patient_id_code = serializers.SerializerMethodField()
    doctor_name     = serializers.SerializerMethodField()
    clinic_name     = serializers.SerializerMethodField()
    treatment_type_details = TreatmentTypeSerializer(source='treatment_type', read_only=True)
    is_first_visit  = serializers.BooleanField(read_only=True)

    class Meta:
        model  = Appointment
        fields = [
            'id', 'clinic', 'clinic_name', 'patient', 'patient_name', 'patient_id_code',
            'doctor', 'doctor_name', 'treatment_type', 'treatment_type_details', 
            'appointment_date', 'appointment_time', 'end_time',
            'reason', 'status', 'notes', 'recurring_group_id', 'is_first_visit', 
            'patient_is_vip', 'patient_is_high_risk', 'patient_risk_details',
            'arrival_time', 'insurance_verified',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'clinic', 'is_first_visit', 'patient_is_vip', 'patient_is_high_risk'] 
    
    def get_patient_name(self, obj):
        return obj.patient.get_full_name()

    def get_patient_id_code(self, obj):
        return obj.patient.patient_id

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name() if obj.doctor else None

    def get_clinic_name(self, obj):
        return obj.clinic.clinic_name if obj.clinic else None

    patient_is_vip         = serializers.BooleanField(source='patient.is_vip', read_only=True)
    patient_is_high_risk   = serializers.BooleanField(source='patient.is_high_risk', read_only=True)
    patient_risk_details   = serializers.CharField(source='patient.risk_details', read_only=True)


class WaitlistEntrySerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = WaitlistEntry
        fields = '__all__'
        read_only_fields = ['clinic']

    def get_patient_name(self, obj):
        return obj.patient.get_full_name() if obj.patient else None

    def get_doctor_name(self, obj):
        return obj.preferred_doctor.get_full_name() if obj.preferred_doctor else None
