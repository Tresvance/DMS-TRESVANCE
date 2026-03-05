from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, PatientDocumentViewSet

router = DefaultRouter()
router.register(r"documents", PatientDocumentViewSet, basename="patient-document")
router.register(r"", PatientViewSet, basename="patient")

urlpatterns = [path("", include(router.urls))]
