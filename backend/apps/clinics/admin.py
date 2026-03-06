from django.contrib import admin
from .models import Clinic, Payment


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = [
        'clinic_name', 'registration_number', 'phone', 'email',
        'subscription_status', 'is_trial', 'subscription_amount',
        'is_active', 'created_at'
    ]
    list_filter = ['is_active', 'subscription_status', 'is_trial']
    search_fields = ['clinic_name', 'registration_number', 'email']
    fieldsets = (
        ('Basic Info', {
            'fields': ('clinic_name', 'clinic_code', 'registration_number', 'address', 'phone', 'email')
        }),
        ('Subscription', {
            'fields': (
                'subscription_amount', 'is_trial', 'trial_days',
                'subscription_status', 'trial_start_date', 'trial_end_date',
                'subscription_end_date'
            )
        }),
        ('Status', {
            'fields': ('is_active', 'created_by')
        }),
    )
    readonly_fields = ['trial_start_date', 'trial_end_date', 'subscription_end_date']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'clinic', 'amount', 'status', 'subscription_months',
        'payment_date', 'created_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['clinic__clinic_name', 'razorpay_order_id', 'razorpay_payment_id']
    readonly_fields = [
        'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature',
        'payment_date', 'created_at', 'updated_at'
    ]
