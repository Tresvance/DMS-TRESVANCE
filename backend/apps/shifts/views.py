from rest_framework import viewsets, permissions
from .models import Shift, Leave
from .serializers import ShiftSerializer, LeaveSerializer

class ShiftViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only show shifts for the user's clinic
        return Shift.objects.filter(clinic=self.request.user.clinic)

    def perform_create(self, serializer):
        # Auto-assign the clinic from the current user
        serializer.save(clinic=self.request.user.clinic)

class LeaveViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Leave.objects.filter(clinic=self.request.user.clinic).order_by('-start_date')

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)
