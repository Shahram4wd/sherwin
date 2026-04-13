from django.contrib import admin

from .models import TimelineEvent


@admin.register(TimelineEvent)
class TimelineEventAdmin(admin.ModelAdmin):
    list_display = ["title", "event_date", "created_at"]
