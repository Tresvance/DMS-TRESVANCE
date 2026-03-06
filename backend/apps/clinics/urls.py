from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClinicViewSet, PaymentViewSet,
    clinic_by_subdomain, create_payment_order,
    verify_payment, get_subscription_status
)

router = DefaultRouter()
router.register(r'', ClinicViewSet, basename='clinic')

# Separate router for payments
payment_router = DefaultRouter()
payment_router.register(r'', PaymentViewSet, basename='payment')

urlpatterns = [
    path('info/', clinic_by_subdomain, name='clinic-info'),  # Public endpoint
    # Payment endpoints
    path('payments/create-order/', create_payment_order, name='create-payment-order'),
    path('payments/verify/', verify_payment, name='verify-payment'),
    path('payments/', include(payment_router.urls)),
    path('<int:clinic_id>/subscription/', get_subscription_status, name='subscription-status'),
    # Clinic CRUD
    path('', include(router.urls)),
]
