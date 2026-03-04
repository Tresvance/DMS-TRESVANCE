from django.contrib import admin
from .models import Medicine


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'stock_quantity', 'expiry_date', 'price', 'clinic']
    list_filter = ['category', 'is_active', 'clinic']
    search_fields = ['name', 'supplier_name']
