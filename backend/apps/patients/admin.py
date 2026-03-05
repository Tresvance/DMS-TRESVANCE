from django.contrib import admin
from .models import Patient, PatientDocument


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['patient_id', 'first_name', 'last_name', 'gender', 'phone', 'clinic', 'created_at']
    list_filter = ['gender', 'blood_group', 'clinic']
    search_fields = ['patient_id', 'first_name', 'last_name', 'phone', 'email']
    readonly_fields = ['patient_id', 'created_at']


@admin.register(PatientDocument)
class PatientDocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'patient', 'document_type', 'uploaded_by', 'file_size', 'created_at']
    list_filter = ['document_type', 'is_active', 'created_at']
    search_fields = ['title', 'description', 'patient__first_name', 'patient__last_name']
    readonly_fields = ['file_size', 'created_at', 'updated_at']
    raw_id_fields = ['patient', 'uploaded_by', 'medical_record']
