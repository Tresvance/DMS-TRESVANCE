from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter

from .models import User
from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer,
    UserProfileSerializer, ChangePasswordSerializer
)
from .permissions import IsSuperAdmin, IsSuperOrClinicAdmin


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data['refresh'])
            token.blacklist()
            return Response({'message': 'Logged out successfully.'})
        except Exception:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    filter_backends  = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['role', 'is_active', 'clinic']
    search_fields    = ['first_name', 'last_name', 'email', 'phone']

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsSuperAdmin()]
        if self.action == 'create':
            return [IsSuperOrClinicAdmin()]
        if self.action in ['update', 'partial_update']:
            return [IsSuperOrClinicAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        if user.role == 'SUPER_ADMIN':
            return User.objects.exclude(role='SUPER_ADMIN').select_related('clinic')

        # SUPPORT_AGENT has no clinic — return empty queryset
        if user.role == 'SUPPORT_AGENT':
            return User.objects.none()

        # Clinic staff — only see their own clinic users
        if user.clinic:
            return User.objects.filter(
                clinic=user.clinic
            ).exclude(role__in=['SUPER_ADMIN', 'SUPPORT_AGENT']).select_related('clinic')

        return User.objects.none()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    @action(detail=False, methods=['get', 'put', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        if request.method == 'GET':
            return Response(UserProfileSerializer(request.user).data)
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            return Response({'message': 'Password changed successfully.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.clinics.models import Clinic
        from apps.patients.models import Patient
        from apps.appointments.models import Appointment
        from apps.billing.models import Billing
        from django.db.models import Sum
        from django.utils import timezone

        user  = request.user
        today = timezone.now().date()
        data  = {}

        if user.role == 'SUPER_ADMIN':
            data = {
                'total_clinics':       Clinic.objects.count(),
                'total_clinic_admins': User.objects.filter(role='CLINIC_ADMIN').count(),
                'total_doctors':       User.objects.filter(role='DOCTOR').count(),
                'total_staff':         User.objects.filter(role__in=['CLINIC_ADMIN', 'DOCTOR', 'RECEPTION']).count(),
                'total_patients':      Patient.objects.count(),
                'total_revenue':       Billing.objects.aggregate(t=Sum('paid_amount'))['t'] or 0,
                'pending_balance':     Billing.objects.aggregate(t=Sum('balance'))['t'] or 0,
                'appointments_today':  Appointment.objects.filter(appointment_date=today).count(),
            }

        elif user.role == 'SUPPORT_AGENT':
            from apps.support.models import Ticket
            assigned = Ticket.objects.filter(assigned_to=user)
            data = {
                'total_assigned': assigned.count(),
                'open':           assigned.filter(status='Open').count(),
                'in_progress':    assigned.filter(status='In Progress').count(),
                'waiting':        assigned.filter(status='Waiting').count(),
                'resolved':       assigned.filter(status='Resolved').count(),
                'closed':         assigned.filter(status='Closed').count(),
                'critical':       assigned.filter(priority='Critical').count(),
            }

        elif user.role == 'CLINIC_ADMIN':
            clinic = user.clinic
            data = {
                'total_doctors':      User.objects.filter(clinic=clinic, role='DOCTOR').count(),
                'total_reception':    User.objects.filter(clinic=clinic, role='RECEPTION').count(),
                'total_patients':     Patient.objects.filter(clinic=clinic).count(),
                'appointments_today': Appointment.objects.filter(clinic=clinic, appointment_date=today).count(),
                'total_revenue':      Billing.objects.filter(clinic=clinic).aggregate(t=Sum('paid_amount'))['t'] or 0,
                'pending_balance':    Billing.objects.filter(clinic=clinic).aggregate(t=Sum('balance'))['t'] or 0,
                'pending_bills':      Billing.objects.filter(clinic=clinic, status='Pending').count(),
            }

        elif user.role == 'DOCTOR':
            clinic = user.clinic
            appts_today = Appointment.objects.filter(doctor=user, appointment_date=today)
            data = {
                'appointments_today': appts_today.count(),
                'scheduled_today':    appts_today.filter(status='Scheduled').count(),
                'completed_today':    appts_today.filter(status='Completed').count(),
                'total_patients':     Patient.objects.filter(clinic=clinic).count(),
                'pending_treatments': Appointment.objects.filter(
                    doctor=user, status='Scheduled', appointment_date__gte=today
                ).count(),
            }

        elif user.role == 'RECEPTION':
            clinic = user.clinic
            data = {
                'appointments_today': Appointment.objects.filter(clinic=clinic, appointment_date=today).count(),
                'total_patients':     Patient.objects.filter(clinic=clinic).count(),
                'new_patients_today': Patient.objects.filter(clinic=clinic, created_at__date=today).count(),
                'billing_today':      Billing.objects.filter(clinic=clinic, invoice_date=today).aggregate(t=Sum('paid_amount'))['t'] or 0,
                'pending_bills':      Billing.objects.filter(clinic=clinic, status='Pending').count(),
            }

        return Response(data)
