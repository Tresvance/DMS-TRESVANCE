from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/clinics/', include('apps.clinics.urls')),
    path('api/patients/', include('apps.patients.urls')),
    path('api/appointments/', include('apps.appointments.urls')),
    path('api/records/', include('apps.records.urls')),
    path('api/medicines/', include('apps.medicines.urls')),
    path('api/billing/', include('apps.billing.urls')),
    path('api/support/', include('apps.support.urls')),
    path('api/shifts/', include('apps.shifts.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


# -- Admin Branding ------------------------------------------------------------
admin.site.site_header = 'DMS-TRESVANCE Administration'
admin.site.site_title  = 'DMS-TRESVANCE Admin'
admin.site.index_title = 'Tresvance Dental Management System'

