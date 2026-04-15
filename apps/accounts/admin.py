from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from unfold.admin import ModelAdmin, StackedInline

from .models import PinProfile, UserProfile


class PinProfileInline(StackedInline):
    model = PinProfile
    can_delete = False
    readonly_fields = ("pin_hash",)


class UserProfileInline(StackedInline):
    model = UserProfile
    can_delete = False


admin.site.unregister(User)


@admin.register(User)
class UserAdmin(ModelAdmin, BaseUserAdmin):
    inlines = [UserProfileInline, PinProfileInline]


@admin.register(PinProfile)
class PinProfileAdmin(ModelAdmin):
    list_display = ("user", "created_at", "updated_at")
    readonly_fields = ("pin_hash", "created_at", "updated_at")
