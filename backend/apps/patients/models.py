import uuid
from django.db import models
from django.utils import timezone
from datetime import timedelta


def generate_patient_id():
    return 'PAT-' + str(uuid.uuid4()).upper()[:8]


class Patient(models.Model):
    class Gender(models.TextChoices):
        MALE = 'Male', 'Male'
        FEMALE = 'Female', 'Female'
        OTHER = 'Other', 'Other'

    class BloodGroup(models.TextChoices):
        A_POS = 'A+', 'A+'
        A_NEG = 'A-', 'A-'
        B_POS = 'B+', 'B+'
        B_NEG = 'B-', 'B-'
        O_POS = 'O+', 'O+'
        O_NEG = 'O-', 'O-'
        AB_POS = 'AB+', 'AB+'
        AB_NEG = 'AB-', 'AB-'
        UNKNOWN = 'Unknown', 'Unknown'

    class MaritalStatus(models.TextChoices):
        SINGLE = 'Single', 'Single'
        MARRIED = 'Married', 'Married'
        DIVORCED = 'Divorced', 'Divorced'
        WIDOWED = 'Widowed', 'Widowed'

    class ContactMethod(models.TextChoices):
        PHONE = 'Phone', 'Phone'
        EMAIL = 'Email', 'Email'
        WHATSAPP = 'WhatsApp', 'WhatsApp'
        SMS = 'SMS', 'SMS'

    class PatientStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        INACTIVE = 'INACTIVE', 'Inactive'
        TRANSFERRED = 'TRANSFERRED', 'Transferred'
        DECEASED = 'DECEASED', 'Deceased'
        ARCHIVED = 'ARCHIVED', 'Archived'

    clinic = models.ForeignKey('clinics.Clinic', on_delete=models.CASCADE, related_name='patients')
    patient_id = models.CharField(max_length=20, unique=True, default=generate_patient_id)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100)
    gender = models.CharField(max_length=10, choices=Gender.choices)
    date_of_birth = models.DateField()
    marital_status = models.CharField(max_length=20, choices=MaritalStatus.choices, blank=True, null=True)
    occupation = models.CharField(max_length=100, blank=True)
    
    # Contact Info
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    preferred_contact_method = models.CharField(max_length=20, choices=ContactMethod.choices, default=ContactMethod.PHONE)
    
    # Address
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    
    blood_group = models.CharField(max_length=10, choices=BloodGroup.choices, default=BloodGroup.UNKNOWN)
    allergies = models.TextField(blank=True)
    medical_history = models.TextField(blank=True)
    
    # Emergency Contact
    emergency_contact_name = models.CharField(max_length=150, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relationship = models.CharField(max_length=100, blank=True)
    
    # Insurance Information
    insurance_provider = models.CharField(max_length=150, blank=True)
    insurance_policy_number = models.CharField(max_length=100, blank=True)
    insurance_coverage_details = models.TextField(blank=True)
    
    # Referral
    referring_source = models.CharField(max_length=150, blank=True)
    status = models.CharField(
        max_length=20, 
        choices=PatientStatus.choices, 
        default=PatientStatus.ACTIVE
    )
    is_active = models.BooleanField(default=True)
    is_vip = models.BooleanField(default=False, help_text="Priority patient for scheduling")
    is_high_risk = models.BooleanField(default=False, help_text="Patient with critical medical complications")
    risk_details = models.TextField(blank=True, help_text="Specific details about medical risks")
    merged_into = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, 
        related_name='merged_duplicates', help_text='The primary record this patient was merged into'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'patients'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.patient_id} - {self.first_name} {self.last_name}"

    def get_full_name(self):
        names = [self.first_name, self.middle_name, self.last_name]
        return " ".join([n for n in names if n]).strip()

    @property
    def age(self):
        from django.utils import timezone
        today = timezone.now().date()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    @property
    def is_new(self):
        """Returns True if the patient was created within the last 7 days."""
        return self.created_at >= timezone.now() - timedelta(days=7)


def patient_document_path(instance, filename):
    """Generate upload path: patient_documents/{clinic_id}/{patient_id}/{filename}"""
    return f'patient_documents/{instance.patient.clinic_id}/{instance.patient.id}/{filename}'


class PatientDocument(models.Model):
    """
    Stores X-rays, CT scans, reports, and other patient documents.
    Supports multiple files per patient with categorization.
    """
    class DocumentType(models.TextChoices):
        XRAY = 'XRAY', 'X-Ray'
        CT_SCAN = 'CT_SCAN', 'CT Scan'
        MRI = 'MRI', 'MRI Scan'
        LAB_REPORT = 'LAB_REPORT', 'Lab Report'
        PRESCRIPTION = 'PRESCRIPTION', 'Prescription'
        CONSENT_FORM = 'CONSENT', 'Consent Form'
        INSURANCE = 'INSURANCE', 'Insurance Document'
        PHOTO = 'PHOTO', 'Clinical Photo'
        OTHER = 'OTHER', 'Other'

    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='documents'
    )
    document_type = models.CharField(
        max_length=20, choices=DocumentType.choices, default=DocumentType.OTHER
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to=patient_document_path)
    file_size = models.PositiveIntegerField(default=0, help_text='File size in bytes')
    uploaded_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True, related_name='uploaded_documents'
    )
    medical_record = models.ForeignKey(
        'records.MedicalRecord', on_delete=models.SET_NULL, 
        null=True, blank=True, related_name='documents',
        help_text='Link to specific visit/record if applicable'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'patient_documents'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_document_type_display()}: {self.title}"

    def save(self, *args, **kwargs):
        if self.file:
            self.file_size = self.file.size
        super().save(*args, **kwargs)

    @property
    def file_extension(self):
        if self.file:
            return self.file.name.split('.')[-1].lower()
        return ''

    @property
    def is_image(self):
        return self.file_extension in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']


class PatientConsent(models.Model):
    """
    Stores legal consent permissions from patients regarding data sharing, 
    medical treatment, and marketing.
    """
    class ConsentType(models.TextChoices):
        GENERAL_TREATMENT = 'TREATMENT', 'Medical Treatment'
        DATA_PRIVACY = 'DATA_PRIVACY', 'Data Privacy (GDPR/HIPAA)'
        MARKETING = 'MARKETING', 'Marketing Communications'
        TELEHEALTH = 'TELEHEALTH', 'Telehealth Consent'

    class ConsentStatus(models.TextChoices):
        GRANTED = 'GRANTED', 'Granted'
        REVOKED = 'REVOKED', 'Revoked'
        EXPIRED = 'EXPIRED', 'Expired'

    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='consents'
    )
    consent_type = models.CharField(
        max_length=20, choices=ConsentType.choices
    )
    status = models.CharField(
        max_length=15, choices=ConsentStatus.choices, default=ConsentStatus.GRANTED
    )
    is_signed = models.BooleanField(default=False)
    signer_name = models.CharField(max_length=150, help_text="Full name as typed by signer")
    
    # Audit trail
    signed_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    recorded_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True, related_name='recorded_consents'
    )
    witness_name = models.CharField(max_length=150, blank=True, help_text="Clinic staff who witnessed sign-off")
    
    notes = models.TextField(blank=True)
    document = models.ForeignKey(
        'PatientDocument', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='linked_consents',
        help_text="Reference to scanned physical document if available"
    )

    class Meta:
        db_table = 'patient_consents'
        ordering = ['-signed_at']

    def __str__(self):
        return f"{self.get_consent_type_display()} - {self.patient.get_full_name()} ({self.status})"

    @property
    def is_active(self):
        from django.utils import timezone
        if self.status != self.ConsentStatus.GRANTED:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True
