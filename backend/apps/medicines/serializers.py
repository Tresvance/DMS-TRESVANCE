from rest_framework import serializers
from .models import Medicine


class MedicineSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Medicine
        fields = [
            'id', 'clinic', 'name', 'category', 'stock_quantity',
            'expiry_date', 'price', 'supplier_name', 'is_active',
            'is_low_stock', 'is_expired', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
