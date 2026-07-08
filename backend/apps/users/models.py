from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'SUPER_ADMIN')
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        SUPER_ADMIN     = 'SUPER_ADMIN',     'Super Admin (Tresvance)'
        SUPPORT_AGENT   = 'SUPPORT_AGENT',   'Support Agent (Tresvance)'
        ADMIN           = 'ADMIN',           'Admin'
        DENTIST         = 'DENTIST',         'Dentist'
        HYGIENIST       = 'HYGIENIST',       'Hygienist/Assistant'
        RECEPTION       = 'RECEPTION',       'Receptionist'
        ACCOUNT_MANAGER = 'ACCOUNT_MANAGER', 'Account Manager'

    first_name = models.CharField(max_length=100)
    last_name  = models.CharField(max_length=100)
    email      = models.EmailField(unique=True)
    phone      = models.CharField(max_length=20, blank=True)
    role       = models.CharField(max_length=20, choices=Role.choices, default=Role.RECEPTION)

    # SUPER_ADMIN has no clinic (null). All others must have one.
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='staff'
    )
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    failed_login_attempts = models.IntegerField(default=0)
    last_failed_login     = models.DateTimeField(null=True, blank=True)
    password_last_changed = models.DateTimeField(null=True, blank=True)
    force_password_change = models.BooleanField(default=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UserManager()

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_super_admin(self):
        return self.role == self.Role.SUPER_ADMIN

    @property
    def is_support_agent(self):
        return self.role == self.Role.SUPPORT_AGENT

    @property
    def is_clinic_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_doctor(self):
        return self.role == self.Role.DENTIST

    @property
    def is_nurse(self):
        return self.role == self.Role.HYGIENIST

    @property
    def is_reception(self):
        return self.role == self.Role.RECEPTION

    @property
    def is_account_manager(self):
        return self.role == self.Role.ACCOUNT_MANAGER

class UserPasswordHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_history')
    password = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_password_history'
        ordering = ['-created_at']

class StaffProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staff_profile')
    department = models.CharField(max_length=100, blank=True)
    specialization = models.CharField(max_length=100, blank=True)
    performance_metrics = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'staff_profiles'

class StaffCredential(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='credentials')
    name = models.CharField(max_length=200)
    license_number = models.CharField(max_length=100)
    expiration_date = models.DateField()
    is_verified = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'staff_credentials'

class AuditLog(models.Model):
    class ActionType(models.TextChoices):
        LOGIN_SUCCESS = 'LOGIN_SUCCESS', 'Login Success'
        LOGIN_FAILED = 'LOGIN_FAILED', 'Login Failed'
        PERMISSION_CHANGE = 'PERMISSION_CHANGE', 'Permission Change'
        ADMIN_ACTION = 'ADMIN_ACTION', 'Admin Action'
        
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=50, choices=ActionType.choices)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    description = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
