from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MedicalRecordViewSet, ClinicalNoteViewSet

router = DefaultRouter()
router.register(r"notes", ClinicalNoteViewSet, basename="clinical-note")
router.register(r"", MedicalRecordViewSet, basename="record")

urlpatterns = [path("", include(router.urls))]
