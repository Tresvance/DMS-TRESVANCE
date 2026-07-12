from django.db import models


class TreatmentType(models.Model):
    name = models.CharField(max_length=100)
    duration_minutes = models.IntegerField(default=30)
    color_code = models.CharField(max_length=20, default="#3B82F6") # Default blue
    buffer_minutes = models.IntegerField(default=0)

    class Meta:
        db_table = 'treatment_types'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.duration_minutes}m)"


class BlockTime(models.Model):
    doctor = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='blocked_times',
        limit_choices_to={'role': 'DENTIST'}
    )
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    reason = models.CharField(max_length=255)
    
    class Meta:
        db_table = 'block_times'
        ordering = ['start_datetime']

    def __str__(self):
        return f"Block for {self.doctor} from {self.start_datetime} to {self.end_datetime}"


class Appointment(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = 'Scheduled', 'Scheduled'
        CONFIRMED = 'Confirmed', 'Confirmed'
        CHECKED_IN = 'Checked-In', 'Checked-In'
        IN_PROGRESS = 'In-Progress', 'In-Progress'
        COMPLETED = 'Completed', 'Completed'
        CANCELLED = 'Cancelled', 'Cancelled'
        NO_SHOW = 'No Show', 'No Show'

    clinic = models.ForeignKey('clinics.Clinic', on_delete=models.CASCADE, related_name='appointments')
    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='appointments',
        limit_choices_to={'role': 'DENTIST'}
    )
    treatment_type = models.ForeignKey(TreatmentType, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    notes = models.TextField(blank=True)
    recurring_group_id = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'appointments'
        ordering = ['-appointment_date', '-appointment_time']

    def __str__(self):
        return f"{self.patient} - {self.appointment_date} {self.appointment_time}"
