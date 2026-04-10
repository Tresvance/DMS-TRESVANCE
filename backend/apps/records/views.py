from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import MedicalRecord, ClinicalNote
from .serializers import MedicalRecordSerializer, ClinicalNoteSerializer
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
        
        # Determine the clinic
        if user.role == 'SUPER_ADMIN':
            clinic = serializer.validated_data.get('clinic')
        else:
            clinic = user.clinic
            
        # Determine the doctor
        if user.role == 'DOCTOR':
            doctor = user
        else:
            doctor = serializer.validated_data.get('doctor')
            
        serializer.save(clinic=clinic, doctor=doctor)


class ClinicalNoteViewSet(viewsets.ModelViewSet):
    serializer_class = ClinicalNoteSerializer
    permission_classes = [IsAdminOrDoctor]

    def get_queryset(self):
        return ClinicalNote.objects.filter(
            medical_record__clinic=self.request.user.clinic
        ).select_related('author')

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
