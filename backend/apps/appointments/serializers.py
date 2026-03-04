from rest_framework import serializers
from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_id_code = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    clinic_name = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id', 'clinic', 'clinic_name', 'patient', 'patient_name', 'patient_id_code',
            'doctor', 'doctor_name', 'appointment_date', 'appointment_time',
            'reason', 'status', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_patient_name(self, obj):
        return obj.patient.get_full_name()

    def get_patient_id_code(self, obj):
        return obj.patient.patient_id

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name()

    def get_clinic_name(self, obj):
        return obj.clinic.clinic_name
