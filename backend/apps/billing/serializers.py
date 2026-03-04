from rest_framework import serializers
from .models import Billing


class BillingSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    clinic_name = serializers.SerializerMethodField()

    class Meta:
        model = Billing
        fields = [
            'id', 'clinic', 'clinic_name', 'patient', 'patient_name',
            'appointment', 'invoice_number', 'total_amount', 'paid_amount',
            'balance', 'payment_method', 'invoice_date', 'status',
            'notes', 'created_at'
        ]
        read_only_fields = ['id', 'invoice_number', 'balance', 'status', 'created_at']

    def get_patient_name(self, obj):
        return obj.patient.get_full_name()

    def get_clinic_name(self, obj):
        return obj.clinic.clinic_name
