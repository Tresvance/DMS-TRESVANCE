from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import MedicalRecord
from .serializers import MedicalRecordSerializer
from apps.users.permissions import IsAdminOrDoctor


class MedicalRecordViewSet(viewsets.ModelViewSet):
    serializer_class = MedicalRecordSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['patient', 'doctor']
    search_fields = ['patient__first_name', 'patient__last_name', 'diagnosis']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAdminOrDoctor()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['SUPER_ADMIN', 'CLINIC_ADMIN']:
            qs = MedicalRecord.objects.all()
        elif user.role == 'DOCTOR':
            qs = MedicalRecord.objects.filter(clinic=user.clinic, doctor=user)
        else:
            qs = MedicalRecord.objects.filter(clinic=user.clinic)
        return qs.select_related('clinic', 'patient', 'doctor')

    def perform_create(self, serializer):
        user = self.request.user
        clinic = user.clinic if user.role not in ['SUPER_ADMIN', 'CLINIC_ADMIN'] else serializer.validated_data.get('clinic')
        serializer.save(clinic=clinic, doctor=user if user.role == 'DOCTOR' else serializer.validated_data.get('doctor'))
