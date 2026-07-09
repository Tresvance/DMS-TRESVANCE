from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone

from .models import MedicalRecord, ClinicalNote, ClinicalNoteVersion
from .serializers import MedicalRecordSerializer, ClinicalNoteSerializer, ClinicalNoteVersionSerializer
from apps.users.permissions import IsAdminOrDoctor


class MedicalRecordViewSet(viewsets.ModelViewSet):
    serializer_class = MedicalRecordSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['patient', 'doctor', 'patient__date_of_birth']
    search_fields = [
        'patient__first_name', 'patient__middle_name', 'patient__last_name',
        'patient__patient_id', 'patient__phone', 'patient__email', 'diagnosis'
    ]
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAdminOrDoctor()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['SUPER_ADMIN', 'ADMIN']:
            qs = MedicalRecord.objects.all()
        elif user.role == 'DENTIST':
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
        if user.role == 'DENTIST':
            doctor = user
        else:
            doctor = serializer.validated_data.get('doctor')
            
        serializer.save(clinic=clinic, doctor=doctor)

    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        record = self.get_object()
        if record.is_signed:
            return Response({"error": "Record is already signed."}, status=400)
            
        record.is_signed = True
        record.signed_by = request.user
        record.signed_at = timezone.now()
        record.save()
        return Response(MedicalRecordSerializer(record).data)


class ClinicalNoteViewSet(viewsets.ModelViewSet):
    serializer_class = ClinicalNoteSerializer
    permission_classes = [IsAdminOrDoctor]

    def get_queryset(self):
        return ClinicalNote.objects.filter(
            medical_record__clinic=self.request.user.clinic
        ).select_related('author')

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        note = self.get_object()
        versions = ClinicalNoteVersion.objects.filter(note=note)
        serializer = ClinicalNoteVersionSerializer(versions, many=True)
        return Response(serializer.data)
