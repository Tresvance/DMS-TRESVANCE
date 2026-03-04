from django.contrib import admin
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['patient_id', 'first_name', 'last_name', 'gender', 'phone', 'clinic', 'created_at']
    list_filter = ['gender', 'blood_group', 'clinic']
    search_fields = ['patient_id', 'first_name', 'last_name', 'phone', 'email']
    readonly_fields = ['patient_id', 'created_at']
