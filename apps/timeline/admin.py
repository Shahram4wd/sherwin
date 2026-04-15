from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import TimelineEvent


@admin.register(TimelineEvent)
class TimelineEventAdmin(ModelAdmin):
    list_display = ["title", "event_type", "event_date", "linked_post", "created_at"]
    list_filter = ["event_type", "event_date"]
    search_fields = ["title", "description"]
    autocomplete_fields = ["linked_post"]
