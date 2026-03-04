from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClinicViewSet, clinic_by_subdomain

router = DefaultRouter()
router.register(r'', ClinicViewSet, basename='clinic')

urlpatterns = [
    path('info/', clinic_by_subdomain, name='clinic-info'),  # Public endpoint
    path('', include(router.urls)),
]
