from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShiftViewSet, LeaveViewSet

router = DefaultRouter()
router.register(r'leaves', LeaveViewSet, basename='leave')
router.register(r'', ShiftViewSet, basename='shift')

urlpatterns = [
    path('', include(router.urls)),
]
