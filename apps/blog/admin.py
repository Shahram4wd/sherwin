from django.contrib import admin

from .models import Post, PostCategory, PostMedia


@admin.register(PostCategory)
class PostCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "category", "published_at", "created_at"]
    list_filter = ["status", "category", "created_at"]
    search_fields = ["title", "body"]
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy = "created_at"


@admin.register(PostMedia)
class PostMediaAdmin(admin.ModelAdmin):
    list_display = ["post", "caption", "created_at"]
