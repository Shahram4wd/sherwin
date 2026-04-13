from django.contrib import admin

from .models import Album


@admin.register(Album)
class AlbumAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at"]
    prepopulated_fields = {"slug": ("name",)}
