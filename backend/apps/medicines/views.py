from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Medicine
from .serializers import MedicineSerializer
from apps.users.permissions import IsAdminOrDoctor


class MedicineViewSet(viewsets.ModelViewSet):
    serializer_class = MedicineSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'supplier_name']
    ordering = ['name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrDoctor()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['SUPER_ADMIN', 'CLINIC_ADMIN']:
            return Medicine.objects.all().select_related('clinic')
        return Medicine.objects.filter(clinic=user.clinic).select_related('clinic')

    def perform_create(self, serializer):
        user = self.request.user
        clinic = user.clinic if user.role not in ['SUPER_ADMIN', 'CLINIC_ADMIN'] else serializer.validated_data.get('clinic')
        serializer.save(clinic=clinic)
