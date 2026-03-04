from django.contrib import admin
from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ['patient', 'doctor', 'appointment_date', 'appointment_time', 'status', 'clinic']
    list_filter = ['status', 'appointment_date', 'clinic']
    search_fields = ['patient__first_name', 'patient__last_name', 'doctor__first_name']
