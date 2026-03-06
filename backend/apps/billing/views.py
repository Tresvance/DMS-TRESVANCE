from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Billing
from .serializers import BillingSerializer
from apps.users.permissions import IsAdminOrReception


class BillingViewSet(viewsets.ModelViewSet):
    serializer_class = BillingSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'payment_method', 'invoice_date', 'patient']
    search_fields = ['invoice_number', 'patient__first_name', 'patient__last_name']
    ordering = ['-invoice_date']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAdminOrReception()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'SUPER_ADMIN':
            qs = Billing.objects.all()
        else:
            qs = Billing.objects.filter(clinic=user.clinic)
        return qs.select_related('clinic', 'patient', 'appointment').prefetch_related('items')

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'SUPER_ADMIN':
            clinic = serializer.validated_data.get('clinic')
        else:
            clinic = user.clinic
        serializer.save(clinic=clinic)
