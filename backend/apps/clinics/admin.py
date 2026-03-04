from django.contrib import admin
from .models import Clinic


@admin.register(Clinic)
class ClinicAdmin(admin.ModelAdmin):
    list_display = ['clinic_name', 'registration_number', 'phone', 'email', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['clinic_name', 'registration_number', 'email']
