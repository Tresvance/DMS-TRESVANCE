from rest_framework import serializers
from .models import Ticket, TicketComment, TicketAttachment


class TicketAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = TicketAttachment
        fields = ['id', 'file', 'filename', 'uploaded_by', 'uploaded_by_name', 'created_at']
        read_only_fields = ['id', 'uploaded_by', 'created_at']

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name()


class TicketCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_role = serializers.SerializerMethodField()

    class Meta:
        model  = TicketComment
        fields = ['id', 'ticket', 'author', 'author_name', 'author_role',
                  'message', 'is_internal', 'created_at']
        read_only_fields = ['id', 'author', 'created_at']

    def get_author_name(self, obj):
        return obj.author.get_full_name()

    def get_author_role(self, obj):
        return obj.author.role

    def validate(self, attrs):
        request = self.context.get('request')
        # Only support agents and super admin can post internal notes
        if attrs.get('is_internal') and request:
            if request.user.role not in ['SUPER_ADMIN', 'SUPPORT_AGENT']:
                attrs['is_internal'] = False
        return attrs


class TicketListSerializer(serializers.ModelSerializer):
    clinic_name      = serializers.SerializerMethodField()
    raised_by_name   = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    comment_count    = serializers.SerializerMethodField()

    class Meta:
        model  = Ticket
        fields = [
            'id', 'ticket_number', 'clinic', 'clinic_name',
            'raised_by', 'raised_by_name', 'assigned_to', 'assigned_to_name',
            'title', 'category', 'priority', 'status',
            'comment_count', 'created_at', 'updated_at'
        ]

    def get_clinic_name(self, obj):
        return obj.clinic.clinic_name

    def get_raised_by_name(self, obj):
        return obj.raised_by.get_full_name()

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() if obj.assigned_to else None

    def get_comment_count(self, obj):
        return obj.comments.count()


class TicketDetailSerializer(serializers.ModelSerializer):
    clinic_name      = serializers.SerializerMethodField()
    raised_by_name   = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    comments         = serializers.SerializerMethodField()
    attachments      = TicketAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model  = Ticket
        fields = [
            'id', 'ticket_number', 'clinic', 'clinic_name',
            'raised_by', 'raised_by_name', 'assigned_to', 'assigned_to_name',
            'title', 'description', 'category', 'priority', 'status',
            'comments', 'attachments', 'resolved_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'ticket_number', 'raised_by', 'resolved_at', 'created_at']

    def get_clinic_name(self, obj):
        return obj.clinic.clinic_name

    def get_raised_by_name(self, obj):
        return obj.raised_by.get_full_name()

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() if obj.assigned_to else None

    def get_comments(self, obj):
        request = self.context.get('request')
        qs = obj.comments.all()
        # Hide internal notes from clinic users
        if request and request.user.role in ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTION']:
            qs = qs.filter(is_internal=False)
        return TicketCommentSerializer(qs, many=True, context=self.context).data


class TicketCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Ticket
        fields = ['title', 'description', 'category', 'priority']
