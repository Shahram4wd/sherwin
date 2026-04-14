from django.contrib import admin

from .models import PinProfile


@admin.register(PinProfile)
class PinProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at", "updated_at")
    readonly_fields = ("pin_hash", "created_at", "updated_at")
