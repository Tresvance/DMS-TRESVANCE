from django.contrib import admin
from .models import Billing


@admin.register(Billing)
class BillingAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'patient', 'total_amount', 'paid_amount', 'balance', 'status', 'invoice_date']
    list_filter = ['status', 'payment_method', 'clinic']
    search_fields = ['invoice_number', 'patient__first_name', 'patient__last_name']
    readonly_fields = ['invoice_number', 'balance', 'created_at']
