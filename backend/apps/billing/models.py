from django.db import models


class Billing(models.Model):
    class PaymentMethod(models.TextChoices):
        CASH = 'Cash', 'Cash'
        CARD = 'Card', 'Card'
        UPI = 'UPI', 'UPI'
        BANK_TRANSFER = 'Bank Transfer', 'Bank Transfer'
        INSURANCE = 'Insurance', 'Insurance'

    class Status(models.TextChoices):
        PENDING = 'Pending', 'Pending'
        PAID = 'Paid', 'Paid'
        PARTIAL = 'Partial', 'Partial'
        CANCELLED = 'Cancelled', 'Cancelled'

    clinic = models.ForeignKey('clinics.Clinic', on_delete=models.CASCADE, related_name='billings')
    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, related_name='billings')
    appointment = models.OneToOneField(
        'appointments.Appointment', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='billing'
    )
    invoice_number = models.CharField(max_length=50, unique=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    invoice_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing'
        ordering = ['-invoice_date', '-created_at']

    def __str__(self):
        return f"Invoice #{self.invoice_number} - {self.patient}"

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            import uuid
            self.invoice_number = 'INV-' + str(uuid.uuid4()).upper()[:8]
        self.balance = self.total_amount - self.paid_amount
        if self.balance <= 0:
            self.status = self.Status.PAID
        elif self.paid_amount > 0:
            self.status = self.Status.PARTIAL
        super().save(*args, **kwargs)

    def recalculate_total(self):
        """Recalculate total_amount from line items (if any exist)."""
        from django.db.models import Sum
        items_total = self.items.aggregate(total=Sum('amount'))['total']
        if items_total is not None:
            self.total_amount = items_total
            self.save()


class BillingItem(models.Model):
    billing = models.ForeignKey(Billing, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255, help_text='Treatment or service name')
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0,
                                  help_text='Auto-computed: quantity × unit_price')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'billing_items'
        ordering = ['id']

    def __str__(self):
        return f"{self.description} × {self.quantity} = ₹{self.amount}"

    def save(self, *args, **kwargs):
        self.amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)
