from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from django.utils import timezone
from datetime import timedelta
from django.conf import settings

from .models import Clinic, Payment
from .serializers import (
    ClinicSerializer, ClinicPublicSerializer,
    PaymentSerializer, CreateOrderSerializer, VerifyPaymentSerializer
)
from apps.users.permissions import IsSuperAdmin
from . import razorpay_utils


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


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing payment history"""
    serializer_class = PaymentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['clinic', 'status']
    search_fields = ['clinic__clinic_name', 'razorpay_payment_id', 'razorpay_order_id']

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'SUPER_ADMIN':
            return Payment.objects.all().select_related('clinic').order_by('-created_at')
        # Clinic staff see only their clinic's payments
        return Payment.objects.filter(clinic_id=user.clinic_id).select_related('clinic').order_by('-created_at')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_order(request):
    """
    Create a Razorpay order for clinic subscription payment.
    Only CLINIC_ADMIN or SUPER_ADMIN can initiate payments.
    """
    serializer = CreateOrderSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    clinic_id = serializer.validated_data['clinic_id']
    months = serializer.validated_data.get('months', 1)

    # Permission check
    user = request.user
    if user.role == 'SUPER_ADMIN':
        pass  # Super admin can pay for any clinic
    elif user.role == 'CLINIC_ADMIN' and user.clinic_id == clinic_id:
        pass  # Clinic admin can pay for their own clinic
    else:
        return Response(
            {'error': 'Not authorized to make payments for this clinic'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        clinic = Clinic.objects.get(id=clinic_id)
    except Clinic.DoesNotExist:
        return Response(
            {'error': 'Clinic not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if clinic.subscription_amount <= 0:
        return Response(
            {'error': 'Subscription amount not set for this clinic'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Calculate total amount
    total_amount = float(clinic.subscription_amount) * months

    # Create Razorpay order
    try:
        order_data = razorpay_utils.create_order(
            amount=total_amount,
            receipt=f'clinic_{clinic_id}_payment',
            notes={
                'clinic_id': str(clinic_id),
                'clinic_name': clinic.clinic_name,
                'months': str(months),
            }
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to create payment order: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Save payment record
    payment = Payment.objects.create(
        clinic=clinic,
        amount=total_amount,
        razorpay_order_id=order_data['id'],
        subscription_months=months,
        notes=f'Subscription for {months} month(s)'
    )

    return Response({
        'order_id': order_data['id'],
        'amount': order_data['amount'],  # In paise
        'amount_inr': total_amount,
        'currency': order_data['currency'],
        'payment_id': payment.id,
        'clinic_name': clinic.clinic_name,
        'key_id': settings.RAZORPAY_KEY_ID,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    """
    Verify Razorpay payment after completion.
    Updates clinic subscription on successful verification.
    """
    serializer = VerifyPaymentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    razorpay_order_id = serializer.validated_data['razorpay_order_id']
    razorpay_payment_id = serializer.validated_data['razorpay_payment_id']
    razorpay_signature = serializer.validated_data['razorpay_signature']

    # Find the payment record
    try:
        payment = Payment.objects.get(razorpay_order_id=razorpay_order_id)
    except Payment.DoesNotExist:
        return Response(
            {'error': 'Payment order not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Verify signature
    is_valid = razorpay_utils.verify_payment_signature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    )

    if not is_valid:
        payment.status = Payment.PaymentStatus.FAILED
        payment.save()
        return Response(
            {'error': 'Payment verification failed'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Update payment record
    payment.razorpay_payment_id = razorpay_payment_id
    payment.razorpay_signature = razorpay_signature
    payment.status = Payment.PaymentStatus.SUCCESS
    payment.payment_date = timezone.now()
    payment.save()

    # Update clinic subscription
    clinic = payment.clinic
    
    # Calculate new subscription end date
    if clinic.subscription_end_date and clinic.subscription_end_date > timezone.now():
        # Extend existing subscription
        new_end_date = clinic.subscription_end_date + timedelta(days=30 * payment.subscription_months)
    else:
        # Start new subscription
        new_end_date = timezone.now() + timedelta(days=30 * payment.subscription_months)

    clinic.subscription_end_date = new_end_date
    clinic.subscription_status = Clinic.SubscriptionStatus.ACTIVE
    clinic.is_trial = False
    clinic.save()

    return Response({
        'success': True,
        'message': 'Payment verified successfully',
        'payment_id': payment.id,
        'subscription_end_date': clinic.subscription_end_date,
        'subscription_status': clinic.subscription_status,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subscription_status(request, clinic_id):
    """Get subscription status for a clinic"""
    user = request.user

    # Permission check
    if user.role == 'SUPER_ADMIN':
        pass
    elif user.clinic_id == clinic_id:
        pass
    else:
        return Response(
            {'error': 'Not authorized'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        clinic = Clinic.objects.get(id=clinic_id)
    except Clinic.DoesNotExist:
        return Response(
            {'error': 'Clinic not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response({
        'clinic_id': clinic.id,
        'clinic_name': clinic.clinic_name,
        'subscription_amount': str(clinic.subscription_amount),
        'is_trial': clinic.is_trial,
        'trial_end_date': clinic.trial_end_date,
        'subscription_status': clinic.subscription_status,
        'subscription_end_date': clinic.subscription_end_date,
        'is_subscription_active': clinic.is_subscription_active,
        'days_remaining': clinic.days_remaining,
    })
