from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Appointment
from .serializers import AppointmentSerializer
from apps.users.permissions import IsClinicAdminOrReception


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    filter_backends  = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'appointment_date', 'doctor', 'patient']
    search_fields    = ['patient__first_name', 'patient__last_name', 'doctor__first_name', 'reason']
    ordering_fields  = ['appointment_date', 'appointment_time', 'created_at']
    ordering         = ['-appointment_date']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsClinicAdminOrReception()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'SUPER_ADMIN':
            qs = Appointment.objects.all()
        elif user.role == 'CLINIC_ADMIN':
            qs = Appointment.objects.filter(clinic=user.clinic)
        elif user.role == 'DOCTOR':
            qs = Appointment.objects.filter(clinic=user.clinic, doctor=user)
        else:
            qs = Appointment.objects.filter(clinic=user.clinic)
        return qs.select_related('clinic', 'patient', 'doctor')

    def perform_create(self, serializer):
        user   = self.request.user
        clinic = user.clinic if user.role not in ['SUPER_ADMIN'] else serializer.validated_data.get('clinic')
        serializer.save(clinic=clinic)
