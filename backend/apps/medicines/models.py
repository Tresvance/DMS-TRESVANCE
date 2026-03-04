from django.db import models


class Medicine(models.Model):
    class Category(models.TextChoices):
        ANTIBIOTIC = 'Antibiotic', 'Antibiotic'
        ANALGESIC = 'Analgesic', 'Analgesic'
        ANTIFUNGAL = 'Antifungal', 'Antifungal'
        ANTISEPTIC = 'Antiseptic', 'Antiseptic'
        ANESTHETIC = 'Anesthetic', 'Anesthetic'
        VITAMIN = 'Vitamin', 'Vitamin'
        OTHER = 'Other', 'Other'

    clinic = models.ForeignKey('clinics.Clinic', on_delete=models.CASCADE, related_name='medicines')
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=Category.choices, default=Category.OTHER)
    stock_quantity = models.PositiveIntegerField(default=0)
    expiry_date = models.DateField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    supplier_name = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'medicines'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.category})"

    @property
    def is_low_stock(self):
        return self.stock_quantity < 10

    @property
    def is_expired(self):
        from django.utils import timezone
        if self.expiry_date:
            return self.expiry_date < timezone.now().date()
        return False
