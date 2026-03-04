from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Count, Q
from django.utils import timezone

from .models import Ticket, TicketComment, TicketAttachment
from .serializers import (
    TicketListSerializer, TicketDetailSerializer,
    TicketCreateSerializer, TicketCommentSerializer,
    TicketAttachmentSerializer
)


class TicketViewSet(viewsets.ModelViewSet):
    filter_backends  = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority', 'category', 'assigned_to']
    search_fields    = ['ticket_number', 'title', 'description']
    ordering_fields  = ['created_at', 'updated_at', 'priority', 'status']
    ordering         = ['-created_at']

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs   = Ticket.objects.select_related('clinic', 'raised_by', 'assigned_to')

        if user.role == 'SUPER_ADMIN':
            return qs.all()
        elif user.role == 'SUPPORT_AGENT':
            return qs.filter(assigned_to=user)
        elif user.role == 'CLINIC_ADMIN':
            return qs.filter(clinic=user.clinic)
        else:
            # Doctors and Reception can only see tickets they raised
            return qs.filter(raised_by=user)

    def get_serializer_class(self):
        if self.action == 'list':
            return TicketListSerializer
        if self.action == 'create':
            return TicketCreateSerializer
        return TicketDetailSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(
            clinic    = user.clinic,
            raised_by = user,
            status    = Ticket.Status.OPEN
        )

    # ── SUPER ADMIN / SUPPORT AGENT actions ─────────

    @action(detail=True, methods=['patch'], url_path='assign')
    def assign(self, request, pk=None):
        """Super Admin assigns ticket to a support agent."""
        if request.user.role != 'SUPER_ADMIN':
            return Response({'error': 'Only Super Admin can assign tickets.'}, status=403)
        ticket     = self.get_object()
        agent_id   = request.data.get('assigned_to')
        from apps.users.models import User
        try:
            agent = User.objects.get(id=agent_id, role='SUPPORT_AGENT')
        except User.DoesNotExist:
            return Response({'error': 'Support agent not found.'}, status=400)
        ticket.assigned_to = agent
        ticket.status      = Ticket.Status.IN_PROGRESS
        ticket.save()
        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        """Update ticket status."""
        ticket     = self.get_object()
        new_status = request.data.get('status')
        user       = request.user

        allowed_transitions = {
            'SUPER_ADMIN':    list(Ticket.Status.values),
            'SUPPORT_AGENT':  ['In Progress', 'Waiting', 'Resolved'],
            'CLINIC_ADMIN':   ['Closed'],
        }
        allowed = allowed_transitions.get(user.role, [])
        if new_status not in allowed:
            return Response({'error': f'You cannot set status to {new_status}.'}, status=403)

        ticket.status = new_status
        if new_status == 'Resolved':
            ticket.resolved_at = timezone.now()
        ticket.save()
        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='comment')
    def add_comment(self, request, pk=None):
        """Add a comment to a ticket."""
        ticket = self.get_object()
        serializer = TicketCommentSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(ticket=ticket, author=request.user)
            # Update ticket updated_at
            ticket.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='attach')
    def upload_attachment(self, request, pk=None):
        """Upload file attachment to a ticket."""
        ticket = self.get_object()
        file   = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided.'}, status=400)
        attachment = TicketAttachment.objects.create(
            ticket      = ticket,
            uploaded_by = request.user,
            file        = file,
            filename    = file.name,
        )
        return Response(
            TicketAttachmentSerializer(attachment).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        """Ticket statistics per role."""
        user = request.user
        qs   = self.get_queryset()

        data = {
            'total':       qs.count(),
            'open':        qs.filter(status='Open').count(),
            'in_progress': qs.filter(status='In Progress').count(),
            'waiting':     qs.filter(status='Waiting').count(),
            'resolved':    qs.filter(status='Resolved').count(),
            'closed':      qs.filter(status='Closed').count(),
            'critical':    qs.filter(priority='Critical').count(),
            'high':        qs.filter(priority='High').count(),
        }

        if user.role == 'SUPER_ADMIN':
            data['unassigned'] = qs.filter(assigned_to=None).count()
            data['by_clinic']  = list(
                qs.values('clinic__clinic_name')
                  .annotate(count=Count('id'))
                  .order_by('-count')
            )
            data['by_category'] = list(
                qs.values('category')
                  .annotate(count=Count('id'))
                  .order_by('-count')
            )

        return Response(data)


class SupportAgentListView(generics.ListAPIView):
    """List all support agents — used when assigning tickets."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'SUPER_ADMIN':
            return Response({'error': 'Forbidden'}, status=403)
        from apps.users.models import User
        agents = User.objects.filter(role='SUPPORT_AGENT', is_active=True)
        data = [
            {'id': a.id, 'full_name': a.get_full_name(), 'email': a.email}
            for a in agents
        ]
        return Response(data)
