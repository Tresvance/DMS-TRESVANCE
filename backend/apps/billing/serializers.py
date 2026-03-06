from rest_framework import serializers
from .models import Billing, BillingItem


class BillingItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'amount']
        read_only_fields = ['id', 'amount']


class BillingSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    clinic_name = serializers.SerializerMethodField()
    clinic_address = serializers.SerializerMethodField()
    clinic_phone = serializers.SerializerMethodField()
    clinic_email = serializers.SerializerMethodField()
    clinic_registration_number = serializers.SerializerMethodField()
    items = BillingItemSerializer(many=True, required=False)

    class Meta:
        model = Billing
        fields = [
            'id', 'clinic', 'clinic_name', 'clinic_address', 
            'clinic_phone', 'clinic_email', 'clinic_registration_number',
            'patient', 'patient_name',
            'appointment', 'invoice_number', 'total_amount', 'paid_amount',
            'balance', 'payment_method', 'invoice_date', 'status',
            'notes', 'created_at', 'items'
        ]
        read_only_fields = ['id', 'clinic', 'invoice_number', 'balance', 'status', 'created_at']

    def get_patient_name(self, obj):
        return obj.patient.get_full_name()

    def get_clinic_name(self, obj):
        return obj.clinic.clinic_name

    def get_clinic_address(self, obj):
        return obj.clinic.address

    def get_clinic_phone(self, obj):
        return obj.clinic.phone

    def get_clinic_email(self, obj):
        return obj.clinic.email

    def get_clinic_registration_number(self, obj):
        return obj.clinic.registration_number

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        billing = Billing(**validated_data)

        # If line items provided, compute total from them
        if items_data:
            total = sum(
                item['quantity'] * item['unit_price']
                for item in items_data
            )
            billing.total_amount = total

        billing.save()

        # Create the line items
        for item_data in items_data:
            BillingItem.objects.create(billing=billing, **item_data)

        return billing

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        # Update billing fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # If items were provided, replace all items
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                BillingItem.objects.create(billing=instance, **item_data)

            # Recalculate total from new items
            if items_data:
                total = sum(
                    item['quantity'] * item['unit_price']
                    for item in items_data
                )
                instance.total_amount = total

        instance.save()
        return instance
