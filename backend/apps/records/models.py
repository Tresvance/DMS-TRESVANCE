from django.db import models


class MedicalRecord(models.Model):
    clinic = models.ForeignKey('clinics.Clinic', on_delete=models.CASCADE, related_name='medical_records')
    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, related_name='medical_records')
    doctor = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='medical_records',
        limit_choices_to={'role': 'DOCTOR'}
    )
    appointment = models.OneToOneField(
        'appointments.Appointment', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='medical_record'
    )
    diagnosis = models.TextField()
    treatment_plan = models.TextField()
    prescription = models.TextField(blank=True)
    procedures_done = models.TextField(blank=True)
    next_visit_date = models.DateField(null=True, blank=True)
    attachments = models.FileField(upload_to='records/attachments/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'medical_records'
        ordering = ['-created_at']

    def __str__(self):
        return f"Record: {self.patient} - {self.created_at.date()}"
