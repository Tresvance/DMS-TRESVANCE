from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Patient
from .serializers import PatientSerializer, PatientListSerializer
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

    def perform_create(self, serializer):
        user = self.request.user
        clinic = user.clinic if user.role not in ['SUPER_ADMIN', 'CLINIC_ADMIN'] else serializer.validated_data.get('clinic')
        serializer.save(clinic=clinic)
