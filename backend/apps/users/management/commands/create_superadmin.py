"""
One-time setup command to create the Tresvance Super Admin account.
Run: python manage.py create_superadmin
"""
from django.core.management.base import BaseCommand
import getpass


class Command(BaseCommand):
    help = 'Create the Tresvance Super Admin account (run once on first deploy)'

    def handle(self, *args, **kwargs):
        from apps.users.models import User

        if User.objects.filter(role='SUPER_ADMIN').exists():
            self.stdout.write(self.style.WARNING(
                'A Super Admin already exists. Aborting.'
            ))
            return

        self.stdout.write(self.style.SUCCESS('=== Create Tresvance Super Admin ===\n'))

        first_name = input('First name: ').strip()
        last_name  = input('Last name:  ').strip()
        email      = input('Email:      ').strip()

        while True:
            password = getpass.getpass('Password (min 8 chars): ')
            confirm  = getpass.getpass('Confirm password:       ')
            if password != confirm:
                self.stdout.write(self.style.ERROR('Passwords do not match. Try again.'))
            elif len(password) < 8:
                self.stdout.write(self.style.ERROR('Password too short.'))
            else:
                break

        user = User.objects.create_user(
            email      = email,
            password   = password,
            first_name = first_name,
            last_name  = last_name,
            role       = 'SUPER_ADMIN',
            is_staff   = True,
            is_superuser = True,
            clinic     = None,   # Super Admin has no clinic
        )

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Super Admin created: {user.get_full_name()} <{user.email}>'
        ))
        self.stdout.write('You can now log in and start creating clinics.')
