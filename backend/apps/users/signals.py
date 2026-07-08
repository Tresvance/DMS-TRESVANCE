from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender='users.User')
def create_or_update_user_profile(sender, instance, created, **kwargs):
    from .models import StaffProfile
    if created:
        StaffProfile.objects.create(user=instance)
    else:
        # For existing users when saved
        if not hasattr(instance, 'staff_profile'):
            StaffProfile.objects.create(user=instance)
