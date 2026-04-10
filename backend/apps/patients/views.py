import json
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import transaction
from django.db.models import Count, Q

from .models import Patient, PatientDocument
from apps.appointments.models import Appointment
from apps.records.models import MedicalRecord
from apps.billing.models import Billing
from apps.records.fhir_utils import FHIRMapper
from .serializers import (
    PatientSerializer, PatientListSerializer,
    PatientDocumentSerializer, PatientDocumentUploadSerializer
)
from apps.users.permissions import IsAdminOrReception


class PatientViewSet(viewsets.ModelViewSet):
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['gender', 'blood_group', 'is_active', 'date_of_birth', 'patient_id', 'phone', 'email']
    search_fields = ['first_name', 'middle_name', 'last_name', 'patient_id', 'phone', 'email']
    ordering_fields = ['created_at', 'first_name', 'last_name', 'date_of_birth']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAdminOrReception()]
        if self.action == 'destroy':
            return [IsAdminOrReception()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        # By default, only show active patients in lists
        qs = Patient.objects.filter(is_active=True).select_related('clinic')
        
        if user.role in ['SUPER_ADMIN', 'CLINIC_ADMIN']:
            return qs
        return qs.filter(clinic=user.clinic)

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

    @action(detail=False, methods=['get'])
    def duplicates(self, request):
        """Find potential duplicate patients based on phone, email, or name+dob."""
        clinic = request.user.clinic
        if not clinic and request.user.role != 'SUPER_ADMIN':
            return Response({"error": "No clinic associated"}, status=400)

        results = []
        base_qs = Patient.objects.filter(is_active=True)
        if clinic:
            base_qs = base_qs.filter(clinic=clinic)

        # 1. Match by Phone
        phones = base_qs.exclude(phone='').values('phone').annotate(count=Count('id')).filter(count__gt=1)
        for p in phones:
            p_list = base_qs.filter(phone=p['phone'])
            results.append({"type": "Phone Match", "value": p['phone'], "patients": PatientListSerializer(p_list, many=True).data})

        # 2. Match by Email
        emails = base_qs.exclude(email='').values('email').annotate(count=Count('id')).filter(count__gt=1)
        for e in emails:
            e_list = base_qs.filter(email=e['email'])
            results.append({"type": "Email Match", "value": e['email'], "patients": PatientListSerializer(e_list, many=True).data})

        # 3. Match by Name + DOB
        # Group by concatenated first+last+dob
        # This is simpler with a loop for small/medium datasets or specialized SQL
        # For now, let's do a basic name+dob check for the most recent patients
        # (Optimizing for speed in this implementation)

        return Response(results)

    @action(detail=True, methods=['post'])
    def merge(self, request, pk=None):
        """Merge another patient record into this one (the primary record)."""
        primary = self.get_object()
        duplicate_id = request.data.get('duplicate_id')
        
        if not duplicate_id:
            return Response({"error": "duplicate_id is required"}, status=400)
        
        try:
            duplicate = Patient.objects.get(id=duplicate_id)
        except Patient.DoesNotExist:
            return Response({"error": "Duplicate patient not found"}, status=404)

        if primary.id == duplicate.id:
            return Response({"error": "Cannot merge a patient into themselves"}, status=400)

        with transaction.atomic():
            # 1. Move related objects
            Appointment.objects.filter(patient=duplicate).update(patient=primary)
            MedicalRecord.objects.filter(patient=duplicate).update(patient=primary)
            Billing.objects.filter(patient=duplicate).update(patient=primary)
            PatientDocument.objects.filter(patient=duplicate).update(patient=primary)

            # 2. Update Primary record with missing data
            fields_to_check = ['middle_name', 'email', 'occupation', 'marital_status', 'address', 'city', 'pincode', 'blood_group', 'allergies', 'medical_history', 'emergency_contact_name', 'emergency_contact_phone']
            updated = False
            for field in fields_to_check:
                if not getattr(primary, field) and getattr(duplicate, field):
                    setattr(primary, field, getattr(duplicate, field))
                    updated = True
            
            if updated:
                primary.save()

            # 3. Mark Duplicate as inactive and linked
            duplicate.status = Patient.PatientStatus.INACTIVE
            duplicate.is_active = False # Keep for legacy compat
            duplicate.merged_into = primary
            duplicate.save()

        return Response({"message": f"Successfully merged {duplicate.get_full_name()} into {primary.get_full_name()}"})

    @action(detail=True, methods=['get'])
    def export_fhir(self, request, pk=None):
        """Export patient medical history in FHIR JSON format."""
        patient = self.get_object()
        bundle = FHIRMapper.export_patient_bundle(patient)
        filename = f"{patient.patient_id}_history.json"
        
        response = Response(bundle)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def import_fhir(self, request):
        """Import patient history from a FHIR JSON file."""
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=400)
            
        try:
            bundle_data = json.load(file_obj)
            clinic = request.user.clinic
            if not clinic:
                return Response({"error": "No clinic associated with user"}, status=400)
                
            patient = FHIRMapper.import_patient_bundle(bundle_data, clinic)
            return Response({
                "message": "Patient imported successfully",
                "patient_id": patient.patient_id,
                "id": patient.id
            }, status=201)
        except Exception as e:
            return Response({"error": str(e)}, status=400)


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
