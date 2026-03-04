from rest_framework import serializers
from .models import Clinic


class ClinicPublicSerializer(serializers.ModelSerializer):
    """Public serializer for login page - limited fields"""
    class Meta:
        model = Clinic
        fields = ['id', 'clinic_name', 'clinic_code', 'subdomain']


class ClinicSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    staff_count     = serializers.SerializerMethodField()

    class Meta:
        model  = Clinic
        fields = [
            'id', 'clinic_name', 'clinic_code', 'subdomain',
            'registration_number', 'address', 'phone', 'email',
            'created_by', 'created_by_name',
            'is_active', 'staff_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'subdomain', 'created_by']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    def get_staff_count(self, obj):
        return obj.staff.filter(is_active=True).count()

    def validate_clinic_code(self, value):
        # Sanitise: lowercase, only letters and numbers
        import re
        value = re.sub(r'[^a-z0-9]', '', value.lower().strip())
        if not value:
            raise serializers.ValidationError('Clinic code must contain letters or numbers.')
        if len(value) < 2:
            raise serializers.ValidationError('Clinic code must be at least 2 characters.')
        if len(value) > 20:
            raise serializers.ValidationError('Clinic code must be 20 characters or less.')
        return value

    def validate(self, attrs):
        # Check subdomain uniqueness on update
        clinic_code = attrs.get('clinic_code', '')
        if clinic_code:
            subdomain = f'{clinic_code}.tresvance.com'
            qs = Clinic.objects.filter(subdomain=subdomain)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'clinic_code': f'Subdomain {subdomain} is already taken.'})
        return attrs