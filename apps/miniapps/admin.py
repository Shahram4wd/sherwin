from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import MiniApp, MiniAppCategory


@admin.register(MiniAppCategory)
class MiniAppCategoryAdmin(ModelAdmin):
    list_display = ["name"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(MiniApp)
class MiniAppAdmin(ModelAdmin):
    list_display = ["name", "category", "created_at"]
    prepopulated_fields = {"slug": ("name",)}
