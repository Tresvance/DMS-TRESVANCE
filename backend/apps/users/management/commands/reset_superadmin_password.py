"""
Reset Super Admin password securely.
Run: python manage.py reset_superadmin_password
"""
from django.core.management.base import BaseCommand
import getpass


class Command(BaseCommand):
    help = 'Reset the Tresvance Super Admin password'

    def handle(self, *args, **kwargs):
        from apps.users.models import User

        # Find super admin
        try:
            user = User.objects.get(role='SUPER_ADMIN')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(
                'No Super Admin found. Run: python manage.py create_superadmin'
            ))
            return

        self.stdout.write(self.style.SUCCESS('=== Reset Super Admin Password ===\n'))
        self.stdout.write(f'  Account : {user.get_full_name()}')
        self.stdout.write(f'  Email   : {user.email}\n')

        # Prompt new password
        while True:
            password = getpass.getpass('New password (min 8 chars): ')
            confirm  = getpass.getpass('Confirm new password:       ')

            if password != confirm:
                self.stdout.write(self.style.ERROR('Passwords do not match. Try again.\n'))
            elif len(password) < 8:
                self.stdout.write(self.style.ERROR('Password too short. Try again.\n'))
            else:
                break

        user.set_password(password)
        user.save()

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Password reset successfully for {user.email}'
        ))