from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter

from .models import Clinic
from .serializers import ClinicSerializer
from apps.users.permissions import IsSuperAdmin


class ClinicViewSet(viewsets.ModelViewSet):
    serializer_class = ClinicSerializer
    filter_backends  = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['is_active']
    search_fields    = ['clinic_name', 'registration_number', 'email']

    def get_permissions(self):
        # Only Super Admin can create / update / delete clinics
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsSuperAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'SUPER_ADMIN':
            return Clinic.objects.all().select_related('created_by')
        # All other roles see only their own clinic
        return Clinic.objects.filter(id=user.clinic_id).select_related('created_by')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
