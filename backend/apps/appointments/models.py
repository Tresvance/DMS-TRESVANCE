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
    arrival_time = models.DateTimeField(null=True, blank=True)
    insurance_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'appointments'
        ordering = ['-appointment_date', '-appointment_time']

    def __str__(self):
        return f"{self.patient} - {self.appointment_date} {self.appointment_time}"


class WaitlistEntry(models.Model):
    class Priority(models.TextChoices):
        EMERGENCY = 'EMERGENCY', 'Emergency'
        VIP = 'VIP', 'VIP'
        STANDARD = 'STANDARD', 'Standard'

    class Status(models.TextChoices):
        WAITING = 'WAITING', 'Waiting'
        NOTIFIED = 'NOTIFIED', 'Notified'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    clinic = models.ForeignKey('clinics.Clinic', on_delete=models.CASCADE, related_name='waitlist')
    patient = models.ForeignKey('patients.Patient', on_delete=models.CASCADE, related_name='waitlist_entries')
    preferred_date = models.DateField(null=True, blank=True)
    preferred_time_range = models.CharField(max_length=50, blank=True, help_text="e.g. Morning, Afternoon, Any")
    preferred_doctor = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='waitlist_entries',
        limit_choices_to={'role': 'DENTIST'}
    )
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.STANDARD)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.WAITING)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'waitlist_entries'
        ordering = [
            models.Case(
                models.When(priority='EMERGENCY', then=1),
                models.When(priority='VIP', then=2),
                default=3
            ),
            'created_at'
        ]

    def __str__(self):
        return f"{self.patient} - {self.status} (Priority: {self.priority})"
