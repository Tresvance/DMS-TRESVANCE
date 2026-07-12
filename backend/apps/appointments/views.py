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

    def check_conflicts(self, doctor_id, appt_date, start_time, end_time, exclude_id=None):
        if not end_time:
            return  # Can't reliably check conflicts without end time
        
        # Check overlapping appointments
        overlapping_appts = Appointment.objects.filter(
            doctor_id=doctor_id,
            appointment_date=appt_date,
            appointment_time__lt=end_time,
            end_time__gt=start_time,
            status__in=['Scheduled', 'Confirmed', 'Checked-In', 'In-Progress']
        )
        if exclude_id:
            overlapping_appts = overlapping_appts.exclude(id=exclude_id)
            
        if overlapping_appts.exists():
            raise ValidationError("Doctor has another appointment during this time.")

    def perform_create(self, serializer):
        user = self.request.user
        clinic = user.clinic if user.role != 'SUPER_ADMIN' else serializer.validated_data.get('clinic')
        
        # Basic conflict check
        doctor = serializer.validated_data.get('doctor')
        appt_date = serializer.validated_data.get('appointment_date')
        start_time = serializer.validated_data.get('appointment_time')
        end_time = serializer.validated_data.get('end_time')
        
        if doctor and appt_date and start_time and end_time:
            self.check_conflicts(doctor.id, appt_date, start_time, end_time)
            
        serializer.save(clinic=clinic)

    def perform_update(self, serializer):
        doctor = serializer.validated_data.get('doctor', self.get_object().doctor)
        appt_date = serializer.validated_data.get('appointment_date', self.get_object().appointment_date)
        start_time = serializer.validated_data.get('appointment_time', self.get_object().appointment_time)
        end_time = serializer.validated_data.get('end_time', self.get_object().end_time)
        
        if doctor and appt_date and start_time and end_time:
            self.check_conflicts(doctor.id, appt_date, start_time, end_time, exclude_id=self.get_object().id)
            
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
