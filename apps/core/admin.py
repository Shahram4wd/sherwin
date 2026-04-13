from django.contrib import admin

from .models import AboutPage


@admin.register(AboutPage)
class AboutPageAdmin(admin.ModelAdmin):
    list_display = ("title", "updated_at")

    def has_add_permission(self, request):
        # Only allow one instance
        return not AboutPage.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
