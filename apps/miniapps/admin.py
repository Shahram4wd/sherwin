from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import MiniApp, MiniAppCategory


@admin.register(MiniAppCategory)
class MiniAppCategoryAdmin(ModelAdmin):
    list_display = ["name"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(MiniApp)
class MiniAppAdmin(ModelAdmin):
    list_display = ["name", "category", "is_active", "created_at"]
    list_filter = ["is_active", "category"]
    prepopulated_fields = {"slug": ("name",)}
