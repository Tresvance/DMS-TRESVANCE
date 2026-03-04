from django.db import models
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
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.clinic_name} ({self.subdomain})'