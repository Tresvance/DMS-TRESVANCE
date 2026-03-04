from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter

from .models import Clinic
from .serializers import ClinicSerializer, ClinicPublicSerializer
from apps.users.permissions import IsSuperAdmin


@api_view(['GET'])
@permission_classes([AllowAny])
def clinic_by_subdomain(request):
    """
    Public endpoint to get clinic info by subdomain.
    Uses the middleware-detected clinic or subdomain query param.
    """
    # First try to get from middleware
    if hasattr(request, 'clinic') and request.clinic:
        return Response(ClinicPublicSerializer(request.clinic).data)
    
    # Fallback: get from query param
    subdomain = request.query_params.get('subdomain')
    if not subdomain:
        return Response(
            {'error': 'subdomain parameter required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        clinic = Clinic.objects.get(clinic_code__iexact=subdomain, is_active=True)
        return Response(ClinicPublicSerializer(clinic).data)
    except Clinic.DoesNotExist:
        return Response(
            {'error': 'clinic_not_found'},
            status=status.HTTP_404_NOT_FOUND
        )


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
