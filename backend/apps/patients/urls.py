from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PatientViewSet, PatientDocumentViewSet,
    PatientAllergyViewSet, PatientMedicationViewSet, DentalSurgeryHistoryViewSet
)

router = DefaultRouter()
router.register(r"documents", PatientDocumentViewSet, basename="patient-document")
router.register(r"", PatientViewSet, basename="patient")

urlpatterns = [
    path('<int:patient_pk>/allergies/', PatientAllergyViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('<int:patient_pk>/allergies/<int:pk>/', PatientAllergyViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})),
    
    path('<int:patient_pk>/medications/', PatientMedicationViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('<int:patient_pk>/medications/<int:pk>/', PatientMedicationViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})),
    
    path('<int:patient_pk>/surgeries/', DentalSurgeryHistoryViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('<int:patient_pk>/surgeries/<int:pk>/', DentalSurgeryHistoryViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})),
    
    path("", include(router.urls)),
]
