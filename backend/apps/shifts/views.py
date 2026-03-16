from rest_framework import viewsets, permissions
from .models import Shift
from .serializers import ShiftSerializer

class ShiftViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only show shifts for the user's clinic
        return Shift.objects.filter(clinic=self.request.user.clinic)

    def perform_create(self, serializer):
        # Auto-assign the clinic from the current user
        serializer.save(clinic=self.request.user.clinic)
