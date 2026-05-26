from django.contrib import admin

from .models import LabEvent


@admin.register(LabEvent)
class LabEventAdmin(admin.ModelAdmin):
    list_display = ("created_at", "slug", "event", "session_id")
    list_filter = ("slug", "event", "created_at")
    search_fields = ("slug", "event", "session_id")
    date_hierarchy = "created_at"
    readonly_fields = ("slug", "event", "props", "session_id", "created_at")

    def has_add_permission(self, request):  # write-only from the API
        return False
