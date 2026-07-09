import re

with open(r'd:\PRO\backend\apps\patients\models.py', 'r') as f:
    content = f.read()

pattern = re.compile(r'    merged_into = models\.ForeignKey\([\s\S]*?class DocumentType\(models\.TextChoices\):', re.MULTILINE)

replacement = '''    merged_into = models.ForeignKey(
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
        from django.utils import timezone
        from datetime import timedelta
        return self.created_at >= timezone.now() - timedelta(days=7)

    @property
    def loyalty_tier(self):
        """Returns loyalty tier based on number of completed appointments"""
        visit_count = self.appointments.filter(status='Completed').count()
        if visit_count >= 11:
            return 'Platinum'
        elif visit_count >= 6:
            return 'Gold'
        elif visit_count >= 3:
            return 'Silver'
        return 'Bronze'


def patient_document_path(instance, filename):
    """Generate upload path: patient_documents/{clinic_id}/{patient_id}/{filename}"""
    return f'patient_documents/{instance.patient.clinic_id}/{instance.patient.id}/{filename}'


class PatientDocument(models.Model):
    """
    Stores X-rays, CT scans, reports, and other patient documents.
    Supports multiple files per patient with categorization.
    """
    class DocumentType(models.TextChoices):'''

new_content = pattern.sub(replacement, content)

with open(r'd:\PRO\backend\apps\patients\models.py', 'w') as f:
    f.write(new_content)

print('Done')
