from django.db import models
from django.utils import timezone
from datetime import timedelta
import re


def generate_subdomain(clinic_name):
    """
    Generate subdomain code from clinic name.
    'Lake Dental Clinic' → 'lak'
    'Bright Smile'       → 'bri'
    'ABC Dental'         → 'abc'
    """
    # Remove special chars, lowercase, take first word or first 3 chars
    clean = re.sub(r'[^a-zA-Z0-9\s]', '', clinic_name).strip().lower()
    words = clean.split()
    if not words:
        return 'clinic'
    code = words[0][:6]  # first word, max 6 chars
    return code


class Clinic(models.Model):
    class SubscriptionStatus(models.TextChoices):
        TRIAL = 'TRIAL', 'Trial'
        ACTIVE = 'ACTIVE', 'Active'
        PENDING = 'PENDING', 'Pending Payment'
        EXPIRED = 'EXPIRED', 'Expired'
        SUSPENDED = 'SUSPENDED', 'Suspended'

    clinic_name         = models.CharField(max_length=200)
    clinic_code         = models.CharField(max_length=20, unique=True, blank=True,
                            help_text='Short code used for subdomain e.g. LAK')
    subdomain           = models.CharField(max_length=100, unique=True, blank=True,
                            help_text='Full subdomain e.g. lak.tresvance.com')
    registration_number = models.CharField(max_length=100, unique=True)
    address             = models.TextField()
    phone               = models.CharField(max_length=20)
    email               = models.EmailField()
    created_by          = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='owned_clinics',
    )
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Payment and subscription fields
    subscription_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text='Monthly subscription amount in INR (set by Super Admin)'
    )
    is_trial = models.BooleanField(
        default=True,
        help_text='Whether clinic is on trial mode'
    )
    trial_days = models.PositiveIntegerField(
        default=30,
        help_text='Number of trial days'
    )
    trial_start_date = models.DateTimeField(
        null=True, blank=True,
        help_text='When trial started'
    )
    trial_end_date = models.DateTimeField(
        null=True, blank=True,
        help_text='When trial ends'
    )
    subscription_status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.TRIAL,
        help_text='Current subscription status'
    )
    subscription_end_date = models.DateTimeField(
        null=True, blank=True,
        help_text='When current subscription period ends'
    )

    class Meta:
        db_table     = 'clinics'
        verbose_name = 'Clinic'
        verbose_name_plural = 'Clinics'
        ordering = ['clinic_name']

    def save(self, *args, **kwargs):
        # Auto-generate clinic_code and subdomain if not set
        if not self.clinic_code:
            base_code = generate_subdomain(self.clinic_name)
            code      = base_code
            counter   = 1
            # Ensure uniqueness
            while Clinic.objects.filter(clinic_code=code).exclude(pk=self.pk).exists():
                code = f'{base_code}{counter}'
                counter += 1
            self.clinic_code = code

        # Always sync subdomain from clinic_code
        self.subdomain = f'{self.clinic_code}.tresvance.com'

        # Set trial dates if on trial and not already set
        if self.is_trial and not self.trial_start_date:
            self.trial_start_date = timezone.now()
            self.trial_end_date = self.trial_start_date + timedelta(days=self.trial_days)
            self.subscription_status = self.SubscriptionStatus.TRIAL

        # If trial is turned off and no active subscription, set to pending
        if not self.is_trial and self.subscription_status == self.SubscriptionStatus.TRIAL:
            self.subscription_status = self.SubscriptionStatus.PENDING

        super().save(*args, **kwargs)

    @property
    def is_subscription_active(self):
        """Check if clinic has active subscription or valid trial"""
        if self.subscription_status == self.SubscriptionStatus.ACTIVE:
            if self.subscription_end_date:
                return timezone.now() < self.subscription_end_date
            return True
        if self.subscription_status == self.SubscriptionStatus.TRIAL and self.is_trial:
            if self.trial_end_date:
                return timezone.now() < self.trial_end_date
            return True
        return False

    @property
    def days_remaining(self):
        """Get remaining days in current subscription/trial"""
        if self.subscription_status == self.SubscriptionStatus.TRIAL and self.trial_end_date:
            delta = self.trial_end_date - timezone.now()
            return max(0, delta.days)
        if self.subscription_status == self.SubscriptionStatus.ACTIVE and self.subscription_end_date:
            delta = self.subscription_end_date - timezone.now()
            return max(0, delta.days)
        return 0

    def __str__(self):
        return f'{self.clinic_name} ({self.subdomain})'


class Payment(models.Model):
    """Track all payments made by clinics"""
    class PaymentStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'
        REFUNDED = 'REFUNDED', 'Refunded'

    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text='Payment amount in INR'
    )
    razorpay_order_id = models.CharField(
        max_length=100, unique=True, null=True, blank=True,
        help_text='Razorpay order ID'
    )
    razorpay_payment_id = models.CharField(
        max_length=100, unique=True, null=True, blank=True,
        help_text='Razorpay payment ID after successful payment'
    )
    razorpay_signature = models.CharField(
        max_length=255, null=True, blank=True,
        help_text='Razorpay signature for verification'
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING
    )
    payment_date = models.DateTimeField(null=True, blank=True)
    subscription_months = models.PositiveIntegerField(
        default=1,
        help_text='Number of months this payment covers'
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'clinic_payments'
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.clinic.clinic_name} - ₹{self.amount} ({self.status})'