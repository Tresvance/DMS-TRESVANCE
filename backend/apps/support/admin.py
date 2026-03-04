from django.contrib import admin
from .models import Ticket, TicketComment, TicketAttachment


class TicketCommentInline(admin.TabularInline):
    model  = TicketComment
    extra  = 0
    readonly_fields = ['author', 'created_at']


class TicketAttachmentInline(admin.TabularInline):
    model  = TicketAttachment
    extra  = 0
    readonly_fields = ['uploaded_by', 'created_at']


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display   = ['ticket_number', 'title', 'clinic', 'raised_by', 'assigned_to',
                      'category', 'priority', 'status', 'created_at']
    list_filter    = ['status', 'priority', 'category', 'clinic']
    search_fields  = ['ticket_number', 'title', 'description']
    readonly_fields = ['ticket_number', 'raised_by', 'resolved_at', 'created_at']
    inlines        = [TicketCommentInline, TicketAttachmentInline]


@admin.register(TicketComment)
class TicketCommentAdmin(admin.ModelAdmin):
    list_display  = ['ticket', 'author', 'is_internal', 'created_at']
    list_filter   = ['is_internal']
    readonly_fields = ['created_at']
