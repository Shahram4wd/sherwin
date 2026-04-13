from django.contrib import admin

from .models import MiniApp, MiniAppCategory


@admin.register(MiniAppCategory)
class MiniAppCategoryAdmin(admin.ModelAdmin):
    list_display = ["name"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(MiniApp)
class MiniAppAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "created_at"]
    prepopulated_fields = {"slug": ("name",)}
