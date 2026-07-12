from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AppointmentViewSet, TreatmentTypeViewSet, BlockTimeViewSet

router = DefaultRouter()
router.register(r"treatment-types", TreatmentTypeViewSet, basename="treatment-types")
router.register(r"block-times", BlockTimeViewSet, basename="block-times")
router.register(r"", AppointmentViewSet, basename="appointment")

urlpatterns = [path("", include(router.urls))]
