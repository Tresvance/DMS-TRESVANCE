from rest_framework import serializers
from .models import Clinic


class ClinicSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = Clinic
        fields = [
            'id', 'clinic_name', 'registration_number', 'address',
            'phone', 'email', 'created_by', 'created_by_name',
            'is_active', 'staff_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    def get_staff_count(self, obj):
        return obj.staff.filter(is_active=True).count()
