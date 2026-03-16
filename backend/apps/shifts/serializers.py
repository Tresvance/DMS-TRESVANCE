from rest_framework import serializers
from .models import Shift
from apps.users.serializers import UserSerializer

class ShiftSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    day_display = serializers.CharField(source='get_day_of_week_display', read_only=True)

    class Meta:
        model = Shift
        fields = [
            'id', 'user', 'user_details', 'clinic', 'day_of_week', 'day_display',
            'start_time', 'end_time', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['clinic', 'created_at', 'updated_at']

    def validate(self, data):
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError("End time must be after start time.")
        return data
