from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TicketViewSet, SupportAgentListView

router = DefaultRouter()
router.register(r'tickets', TicketViewSet, basename='ticket')

urlpatterns = [
    path('', include(router.urls)),
    path('agents/', SupportAgentListView.as_view(), name='support-agents'),
]
