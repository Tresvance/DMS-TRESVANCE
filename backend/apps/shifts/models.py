from django.db import models

class Shift(models.Model):
    class DayOfWeek(models.TextChoices):
        MONDAY    = 'MON', 'Monday'
        TUESDAY   = 'TUE', 'Tuesday'
        WEDNESDAY = 'WED', 'Wednesday'
        THURSDAY  = 'THU', 'Thursday'
        FRIDAY    = 'FRI', 'Friday'
        SATURDAY  = 'SAT', 'Saturday'
        SUNDAY    = 'SUN', 'Sunday'

    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='shifts'
    )
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='shifts'
    )
    day_of_week = models.CharField(
        max_length=3,
        choices=DayOfWeek.choices
    )
    start_time = models.TimeField()
    end_time   = models.TimeField()
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shifts'
        verbose_name = 'Shift'
        verbose_name_plural = 'Shifts'
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_day_of_week_display()} ({self.start_time}-{self.end_time})"
