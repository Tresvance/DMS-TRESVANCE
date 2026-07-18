from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClinicViewSet, PaymentViewSet,
    create_payment_order,
    verify_payment, get_subscription_status,
    ClinicSettingsViewSet, ClinicHolidayViewSet
)

router = DefaultRouter()
router.register(r'settings', ClinicSettingsViewSet, basename='clinic-settings')
router.register(r'holidays', ClinicHolidayViewSet, basename='clinic-holidays')
router.register(r'', ClinicViewSet, basename='clinic')

# Separate router for payments
payment_router = DefaultRouter()
payment_router.register(r'', PaymentViewSet, basename='payment')

urlpatterns = [
    # Payment endpoints
    path('payments/create-order/', create_payment_order, name='create-payment-order'),
    path('payments/verify/', verify_payment, name='verify-payment'),
    path('payments/', include(payment_router.urls)),
    path('<int:clinic_id>/subscription/', get_subscription_status, name='subscription-status'),
    # Clinic CRUD
    path('', include(router.urls)),
]
