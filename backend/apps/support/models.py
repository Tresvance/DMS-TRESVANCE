import uuid
from django.db import models


def generate_ticket_number():
    return 'TKT-' + str(uuid.uuid4()).upper()[:8]


class Ticket(models.Model):

    class Category(models.TextChoices):
        BILLING     = 'Billing',          'Billing'
        TECHNICAL   = 'Technical',        'Technical'
        GENERAL     = 'General',          'General'
        FEATURE     = 'Feature Request',  'Feature Request'
        COMPLAINT   = 'Complaint',        'Complaint'
        OTHER       = 'Other',            'Other'

    class Priority(models.TextChoices):
        LOW      = 'Low',      'Low'
        MEDIUM   = 'Medium',   'Medium'
        HIGH     = 'High',     'High'
        CRITICAL = 'Critical', 'Critical'

    class Status(models.TextChoices):
        OPEN        = 'Open',        'Open'
        IN_PROGRESS = 'In Progress', 'In Progress'
        WAITING     = 'Waiting',     'Waiting for Clinic'
        RESOLVED    = 'Resolved',    'Resolved'
        CLOSED      = 'Closed',      'Closed'

    ticket_number = models.CharField(max_length=20, unique=True, default=generate_ticket_number)
    clinic        = models.ForeignKey('clinics.Clinic', on_delete=models.CASCADE, related_name='tickets')
    raised_by     = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='raised_tickets')
    assigned_to   = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_tickets',
        limit_choices_to={'role': 'SUPPORT_AGENT'}
    )
    title       = models.CharField(max_length=255)
    description = models.TextField()
    category    = models.CharField(max_length=30, choices=Category.choices, default=Category.GENERAL)
    priority    = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status      = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'support_tickets'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.ticket_number} - {self.title}"

    def save(self, *args, **kwargs):
        from django.utils import timezone
        if self.status == self.Status.RESOLVED and not self.resolved_at:
            self.resolved_at = timezone.now()
        super().save(*args, **kwargs)


class TicketComment(models.Model):
    ticket     = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comments')
    author     = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='ticket_comments')
    message    = models.TextField()
    is_internal = models.BooleanField(default=False)  # Internal notes only visible to support/admin
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ticket_comments'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author} on {self.ticket.ticket_number}"


class TicketAttachment(models.Model):
    ticket     = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='attachments')
    uploaded_by = models.ForeignKey('users.User', on_delete=models.CASCADE)
    file       = models.FileField(upload_to='tickets/attachments/')
    filename   = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ticket_attachments'

    def __str__(self):
        return f"{self.filename} - {self.ticket.ticket_number}"
