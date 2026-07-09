from django.db import models


class MedicalRecord(models.Model):
    clinic = models.ForeignKey('clinics.Clinic', on_delete=models.CASCADE, related_name='medical_records')
    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, related_name='medical_records')
    doctor = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='medical_records',
        limit_choices_to={'role': 'DENTIST'}
    )
    appointment = models.OneToOneField(
        'appointments.Appointment', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='medical_record'
    )
    diagnosis = models.TextField()
    treatment_plan = models.TextField(null=True, blank=True)
    prescription = models.TextField(blank=True)
    procedures_done = models.TextField(blank=True)
    next_visit_date = models.DateField(null=True, blank=True)
    attachments = models.FileField(upload_to='records/attachments/', null=True, blank=True)
    
    # Periodontal tracking
    periodontal_status = models.TextField(blank=True, help_text="Detailed periodontal and gum health status")
    
    # Digital Signature / Authorization
    is_signed = models.BooleanField(default=False)
    signed_by = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='signed_records'
    )
    signed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'medical_records'
        ordering = ['-created_at']

    def __str__(self):
        return f"Record: {self.patient} - {self.created_at.date()}"


class ClinicalNote(models.Model):
    medical_record = models.ForeignKey(
        MedicalRecord, on_delete=models.CASCADE, related_name='notes'
    )
    author = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='clinical_notes'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'clinical_notes'
        ordering = ['created_at']

    def __str__(self):
        return f"Note by {self.author} on {self.created_at.date()}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if not is_new:
            # Get original note to check for changes
            old_note = ClinicalNote.objects.get(pk=self.pk)
            if old_note.content != self.content:
                # Save snapshot before update
                ClinicalNoteVersion.objects.create(
                    note=self,
                    content_snapshot=old_note.content,
                    modified_by=self.author  # Assuming the author makes the change, otherwise we'd need to pass the current user
                )
        super().save(*args, **kwargs)

class ClinicalNoteVersion(models.Model):
    note = models.ForeignKey(ClinicalNote, on_delete=models.CASCADE, related_name='versions')
    content_snapshot = models.TextField()
    modified_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='note_modifications')
    modified_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'clinical_note_versions'
        ordering = ['-modified_at']

    def __str__(self):
        return f"Version of {self.note} at {self.modified_at}"
