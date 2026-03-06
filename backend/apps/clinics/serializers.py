from rest_framework import serializers
from .models import Clinic, Payment


class ClinicPublicSerializer(serializers.ModelSerializer):
    """Public serializer for login page - limited fields"""
    class Meta:
        model = Clinic
        fields = ['id', 'clinic_name', 'clinic_code', 'subdomain']


class ClinicSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    staff_count     = serializers.SerializerMethodField()
    is_subscription_active = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model  = Clinic
        fields = [
            'id', 'clinic_name', 'clinic_code', 'subdomain',
            'registration_number', 'address', 'phone', 'email',
            'created_by', 'created_by_name',
            'is_active', 'staff_count', 'created_at',
            # Payment/subscription fields
            'subscription_amount', 'is_trial', 'trial_days',
            'trial_start_date', 'trial_end_date',
            'subscription_status', 'subscription_end_date',
            'is_subscription_active', 'days_remaining',
        ]
        read_only_fields = ['id', 'created_at', 'subdomain', 'created_by',
                           'trial_start_date', 'trial_end_date',
                           'subscription_end_date']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    def get_staff_count(self, obj):
        return obj.staff.filter(is_active=True).count()

    def get_is_subscription_active(self, obj):
        return obj.is_subscription_active

    def get_days_remaining(self, obj):
        return obj.days_remaining

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


class PaymentSerializer(serializers.ModelSerializer):
    clinic_name = serializers.CharField(source='clinic.clinic_name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'clinic', 'clinic_name', 'amount',
            'razorpay_order_id', 'razorpay_payment_id',
            'status', 'payment_date', 'subscription_months',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'razorpay_order_id', 'razorpay_payment_id',
            'payment_date', 'created_at', 'updated_at'
        ]


class CreateOrderSerializer(serializers.Serializer):
    """Serializer for creating a Razorpay order"""
    clinic_id = serializers.IntegerField()
    months = serializers.IntegerField(min_value=1, max_value=12, default=1)


class VerifyPaymentSerializer(serializers.Serializer):
    """Serializer for verifying Razorpay payment"""
    razorpay_order_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()