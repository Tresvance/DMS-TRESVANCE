from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
    """Only Tresvance Super Admin."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'SUPER_ADMIN'


class IsClinicAdmin(BasePermission):
    """Clinic-level admin."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'CLINIC_ADMIN'


class IsSuperOrClinicAdmin(BasePermission):
    """Super Admin OR Clinic Admin."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['SUPER_ADMIN', 'CLINIC_ADMIN']


class IsDoctor(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'DOCTOR'


class IsReception(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'RECEPTION'


class IsClinicAdminOrDoctor(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR']


class IsClinicAdminOrReception(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTION']


# Kept for backward compat — maps old name to new logic
IsCompanyAdmin = IsSuperAdmin
IsAdminOrDoctor = IsClinicAdminOrDoctor
IsAdminOrReception = IsClinicAdminOrReception


class IsClinicStaff(BasePermission):
    """Any authenticated clinic staff."""
    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'SUPER_ADMIN':
            return True
        clinic_id = getattr(obj, 'clinic_id', None)
        return clinic_id == request.user.clinic_id
