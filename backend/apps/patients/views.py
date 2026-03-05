from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Patient, PatientDocument
from .serializers import (
    PatientSerializer, PatientListSerializer,
    PatientDocumentSerializer, PatientDocumentUploadSerializer
)
from apps.users.permissions import IsAdminOrReception


class PatientViewSet(viewsets.ModelViewSet):
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['gender', 'blood_group', 'is_active']
    search_fields = ['first_name', 'last_name', 'patient_id', 'phone', 'email']
    ordering_fields = ['created_at', 'first_name', 'last_name']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAdminOrReception()]
        if self.action == 'destroy':
            return [IsAdminOrReception()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['SUPER_ADMIN', 'CLINIC_ADMIN']:
            return Patient.objects.all().select_related('clinic')
        return Patient.objects.filter(clinic=user.clinic).select_related('clinic')

    def get_serializer_class(self):
        if self.action == 'list':
            return PatientListSerializer
        return PatientSerializer

    # def perform_create(self, serializer):
    #     user = self.request.user
    #     clinic = user.clinic if user.role not in ['SUPER_ADMIN', 'CLINIC_ADMIN'] else serializer.validated_data.get('clinic')
    #     serializer.save(clinic=clinic)


    def perform_create(self, serializer):
        user = self.request.user
        if user.role in ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTION']:
            serializer.save(clinic=user.clinic)
        else:
            serializer.save()


class PatientDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for uploading and managing patient documents (X-rays, scans, reports).
    
    Endpoints:
    - GET /patients/documents/ - List all documents (filtered by clinic)
    - GET /patients/documents/?patient=123 - List documents for specific patient
    - POST /patients/documents/ - Upload new document (multipart/form-data)
    - GET /patients/documents/{id}/ - Get document details
    - DELETE /patients/documents/{id}/ - Soft delete document
    """
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['patient', 'document_type', 'is_active', 'medical_record']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'document_type']
    ordering = ['-created_at']

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'SUPER_ADMIN':
            return PatientDocument.objects.all().select_related('patient', 'uploaded_by')
        # Filter by user's clinic through patient relationship
        return PatientDocument.objects.filter(
            patient__clinic=user.clinic
        ).select_related('patient', 'uploaded_by')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PatientDocumentUploadSerializer
        return PatientDocumentSerializer

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    def perform_destroy(self, instance):
        # Soft delete - just mark as inactive
        instance.is_active = False
        instance.save()

    @action(detail=False, methods=['get'])
    def types(self, request):
        """Return available document types for dropdown"""
        return Response([
            {'value': choice[0], 'label': choice[1]}
            for choice in PatientDocument.DocumentType.choices
        ])
