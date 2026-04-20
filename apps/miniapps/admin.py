from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import MiniApp, MiniAppCategory, MiniAppTag


@admin.register(MiniAppCategory)
class MiniAppCategoryAdmin(ModelAdmin):
    list_display = ["name"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(MiniApp)
class MiniAppAdmin(ModelAdmin):
    list_display = ["name", "category", "is_active", "created_at"]
    list_filter = ["is_active", "category", "tags"]
    filter_horizontal = ["tags"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(MiniAppTag)
class MiniAppTagAdmin(ModelAdmin):
    list_display = ["name", "slug"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
