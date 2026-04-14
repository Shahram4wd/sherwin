from django.contrib import admin
from django.utils import timezone

from .models import Post, PostCategory, PostMedia


class PostMediaInline(admin.TabularInline):
    model = PostMedia
    extra = 1
    fields = ["file", "media_type", "alt_text", "caption", "order", "is_gallery_visible"]


@admin.register(PostCategory)
class PostCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "post_type",
        "status",
        "category",
        "created_by",
        "is_featured",
        "published_at",
        "created_at",
    ]
    list_filter = ["post_type", "status", "category", "is_featured", "created_at"]
    search_fields = ["title", "body", "summary"]
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy = "created_at"
    list_editable = ["status", "is_featured"]
    inlines = [PostMediaInline]
    fieldsets = (
        (None, {"fields": ("post_type", "title", "slug", "body", "summary")}),
        ("Classification", {"fields": ("category", "tags", "is_featured")}),
        ("Media", {"fields": ("featured_image",)}),
        ("SEO", {"fields": ("meta_description",), "classes": ("collapse",)}),
        (
            "Publishing",
            {"fields": ("status", "created_by", "published_at")},
        ),
    )
    actions = ["publish_posts", "archive_posts"]

    @admin.action(description="Publish selected posts")
    def publish_posts(self, request, queryset):
        queryset.update(status=Post.Status.PUBLISHED, published_at=timezone.now())

    @admin.action(description="Archive selected posts")
    def archive_posts(self, request, queryset):
        queryset.update(status=Post.Status.ARCHIVED)


@admin.register(PostMedia)
class PostMediaAdmin(admin.ModelAdmin):
    list_display = ["post", "media_type", "alt_text", "order", "is_gallery_visible", "uploaded_at"]
    list_filter = ["media_type", "is_gallery_visible"]
    list_editable = ["order", "is_gallery_visible"]
