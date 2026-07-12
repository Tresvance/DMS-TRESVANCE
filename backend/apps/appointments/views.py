from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import OuterRef, Subquery, Exists, Case, When, Value, BooleanField, Q
from rest_framework.exceptions import ValidationError
from datetime import timedelta, datetime
import uuid

from .models import Appointment, TreatmentType, BlockTime
from .serializers import AppointmentSerializer, TreatmentTypeSerializer, BlockTimeSerializer
from apps.clinics.models import ClinicSettings, ClinicHoliday
from apps.shifts.models import Leave


class TreatmentTypeViewSet(viewsets.ModelViewSet):
    queryset = TreatmentType.objects.all()
    serializer_class = TreatmentTypeSerializer
    permission_classes = [IsAuthenticated]


class BlockTimeViewSet(viewsets.ModelViewSet):
    serializer_class = BlockTimeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'SUPER_ADMIN':
            return BlockTime.objects.all()
        elif user.role == 'DENTIST':
            return BlockTime.objects.filter(doctor=user)
        return BlockTime.objects.filter(doctor__clinic=user.clinic)


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    filter_backends  = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'appointment_date', 'doctor', 'patient']
    search_fields    = ['patient__first_name', 'patient__last_name',
                        'doctor__first_name', 'reason']
    ordering_fields  = ['appointment_date', 'appointment_time', 'created_at']
    ordering         = ['-appointment_date']

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'SUPER_ADMIN':
            qs = Appointment.objects.all()
        elif user.role == 'SUPPORT_AGENT':
            qs = Appointment.objects.none()
        elif user.role == 'DENTIST':
            qs = Appointment.objects.filter(clinic=user.clinic, doctor=user)
        else:
            qs = Appointment.objects.filter(clinic=user.clinic)
        
        # Date range filtering for calendar view
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(appointment_date__gte=start_date)
        if end_date:
            qs = qs.filter(appointment_date__lte=end_date)
        
        # Annotate whether this is the patient's first appointment
        earliest_app_id = Appointment.objects.filter(
            patient_id=OuterRef('patient_id')
        ).order_by('appointment_date', 'appointment_time').values('id')[:1]

        qs = qs.annotate(
            is_first_visit=Case(
                When(id=Subquery(earliest_app_id), then=Value(True)),
                default=Value(False),
                output_field=BooleanField()
            )
        )
        
        return qs.select_related('clinic', 'patient', 'doctor', 'treatment_type')

    def check_conflicts(self, doctor_id, appt_date, start_time, end_time, clinic, exclude_id=None, apply_buffer=True):
        if not end_time:
            return

        if ClinicHoliday.objects.filter(clinic=clinic, date=appt_date).exists():
            raise ValidationError("Clinic is closed on this date (Holiday).")

        if Leave.objects.filter(clinic=clinic, user_id=doctor_id, status='APPROVED', start_date__lte=appt_date, end_date__gte=appt_date).exists():
            raise ValidationError("Doctor is on leave on this date.")

        settings = getattr(clinic, 'settings', None)
        buffer_delta = timedelta(minutes=0)

        if settings and settings.operating_hours:
            day_str = appt_date.strftime("%a").upper()
            day_settings = settings.operating_hours.get(day_str)
            if day_settings:
                if day_settings.get("closed"):
                    raise ValidationError(f"Clinic is closed on {day_str}.")
                try:
                    open_time = datetime.strptime(day_settings.get("start", "00:00"), "%H:%M").time()
                    close_time = datetime.strptime(day_settings.get("end", "23:59"), "%H:%M").time()
                    if start_time < open_time or end_time > close_time:
                        raise ValidationError(f"Appointment is outside operating hours ({open_time} - {close_time}).")
                except ValueError:
                    pass
            
            if apply_buffer:
                buffer_delta = timedelta(minutes=settings.buffer_time_minutes)

        if settings and settings.max_appointments_per_day_per_dentist > 0:
            count = Appointment.objects.filter(
                doctor_id=doctor_id,
                appointment_date=appt_date,
                status__in=['Scheduled', 'Confirmed', 'Checked-In', 'In-Progress']
            ).count()
            if count >= settings.max_appointments_per_day_per_dentist:
                raise ValidationError(f"Doctor has reached maximum appointments ({settings.max_appointments_per_day_per_dentist}) for the day.")

        start_dt = datetime.combine(appt_date, start_time)
        end_dt = datetime.combine(appt_date, end_time)
        
        existing_appts = Appointment.objects.filter(
            doctor_id=doctor_id,
            appointment_date=appt_date,
            status__in=['Scheduled', 'Confirmed', 'Checked-In', 'In-Progress']
        )
        if exclude_id:
            existing_appts = existing_appts.exclude(id=exclude_id)
            
        for appt in existing_appts:
            appt_start = datetime.combine(appt_date, appt.appointment_time)
            appt_end = datetime.combine(appt_date, appt.end_time)
            
            if apply_buffer:
                appt_start = appt_start - buffer_delta
                appt_end = appt_end + buffer_delta
                
            if start_dt < appt_end and end_dt > appt_start:
                raise ValidationError("Doctor has another appointment or buffer conflict during this time.")

    def perform_create(self, serializer):
        user = self.request.user
        clinic = user.clinic if user.role != 'SUPER_ADMIN' else serializer.validated_data.get('clinic')
        
        doctor = serializer.validated_data.get('doctor')
        appt_date = serializer.validated_data.get('appointment_date')
        start_time = serializer.validated_data.get('appointment_time')
        end_time = serializer.validated_data.get('end_time')
        
        apply_buffer = self.request.data.get('apply_buffer', True)
        if isinstance(apply_buffer, str):
            apply_buffer = apply_buffer.lower() == 'true'

        if doctor and appt_date and start_time and end_time:
            self.check_conflicts(doctor.id, appt_date, start_time, end_time, clinic, apply_buffer=apply_buffer)
            
        serializer.save(clinic=clinic)

    def perform_update(self, serializer):
        user = self.request.user
        clinic = user.clinic if user.role != 'SUPER_ADMIN' else serializer.validated_data.get('clinic', self.get_object().clinic)

        doctor = serializer.validated_data.get('doctor', self.get_object().doctor)
        appt_date = serializer.validated_data.get('appointment_date', self.get_object().appointment_date)
        start_time = serializer.validated_data.get('appointment_time', self.get_object().appointment_time)
        end_time = serializer.validated_data.get('end_time', self.get_object().end_time)
        
        apply_buffer = self.request.data.get('apply_buffer', True)
        if isinstance(apply_buffer, str):
            apply_buffer = apply_buffer.lower() == 'true'

        if doctor and appt_date and start_time and end_time:
            self.check_conflicts(doctor.id, appt_date, start_time, end_time, clinic, exclude_id=self.get_object().id, apply_buffer=apply_buffer)
            
        serializer.save()

    def create(self, request, *args, **kwargs):
        # Handle recurrence logic natively via a custom payload param 'recurrence'
        recurrence = request.data.get('recurrence')
        if recurrence:
            count = int(recurrence.get('count', 1))
            interval = recurrence.get('type', 'weekly') # weekly or monthly
            group_id = str(uuid.uuid4())
            
            created_instances = []
            base_date = datetime.strptime(request.data['appointment_date'], '%Y-%m-%d')
            
            for i in range(count):
                if interval == 'weekly':
                    new_date = base_date + timedelta(days=7 * i)
                elif interval == 'monthly':
                    # Approximation for monthly recurrence
                    new_date = base_date + timedelta(days=30 * i)
                else:
                    new_date = base_date
                    
                data = request.data.copy()
                data['appointment_date'] = new_date.strftime('%Y-%m-%d')
                data['recurring_group_id'] = group_id
                
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                created_instances.append(serializer.data)
                
            return Response(created_instances, status=status.HTTP_201_CREATED)
        else:
            return super().create(request, *args, **kwargs)
