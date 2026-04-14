import math

from django.conf import settings
from django.db import models
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify
from taggit.managers import TaggableManager


class PostCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "post categories"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class PublishedManager(models.Manager):
    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(status=Post.Status.PUBLISHED, published_at__lte=timezone.now())
        )


class SnapsManager(models.Manager):
    """Published snaps only."""

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(
                post_type=Post.PostType.SNAP,
                status=Post.Status.PUBLISHED,
                published_at__lte=timezone.now(),
            )
        )


class BlogsManager(models.Manager):
    """Published blog posts only."""

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(
                post_type=Post.PostType.BLOG,
                status=Post.Status.PUBLISHED,
                published_at__lte=timezone.now(),
            )
        )


class Post(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    class PostType(models.TextChoices):
        SNAP = "snap", "Snap"
        BLOG = "blog", "Blog"
        CAPSULE = "capsule", "Capsule"

    post_type = models.CharField(
        max_length=20, choices=PostType.choices, default=PostType.SNAP
    )
    title = models.CharField(max_length=200, blank=True)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    body = models.TextField(blank=True, help_text="Caption for Snaps, rich text for Blog.")
    summary = models.CharField(
        max_length=300,
        blank=True,
        help_text="Auto-generated from body if left blank.",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PUBLISHED
    )
    category = models.ForeignKey(
        PostCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="posts",
    )
    featured_image = models.ImageField(
        upload_to="posts/images/%Y/%m/", null=True, blank=True
    )
    is_featured = models.BooleanField(
        default=False, help_text="Show as hero on homepage"
    )
    meta_description = models.CharField(
        max_length=160,
        blank=True,
        help_text="SEO description. Falls back to summary.",
    )
    tags = TaggableManager(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="posts",
    )
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = models.Manager()
    published = PublishedManager()
    snaps = SnapsManager()
    blogs = BlogsManager()

    class Meta:
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(fields=["-published_at"]),
            models.Index(fields=["status"]),
            models.Index(fields=["category"]),
            models.Index(fields=["post_type"]),
        ]

    def __str__(self):
        return self.title or f"Snap #{self.pk}"

    def save(self, *args, **kwargs):
        # Auto-generate title from caption for snaps
        if not self.title and self.body:
            self.title = self.body[:50].strip()
            if len(self.body) > 50:
                self.title += "…"
        if not self.title:
            self.title = f"Snap"
        if not self.slug:
            base = slugify(self.title) or "snap"
            slug = base
            n = 1
            while Post.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        # Auto-generate summary from body
        if not self.summary and self.body:
            import re
            text = re.sub(r"<[^>]+>", "", self.body)
            self.summary = text[:297] + "..." if len(text) > 300 else text
        # Auto-set published_at for snaps
        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        if self.post_type == self.PostType.SNAP:
            return reverse("snaps:snap_detail", kwargs={"slug": self.slug})
        return reverse("blog:post_detail", kwargs={"slug": self.slug})

    @property
    def reading_time(self):
        import re
        text = re.sub(r"<[^>]+>", "", self.body)
        word_count = len(text.split())
        return max(1, math.ceil(word_count / 200))

    @property
    def seo_description(self):
        return self.meta_description or self.summary or ""

    @property
    def is_snap(self):
        return self.post_type == self.PostType.SNAP


class PostMedia(models.Model):
    class MediaType(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"
        DOCUMENT = "document", "Document"

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="media")
    file = models.FileField(upload_to="blog/media/%Y/%m/")
    media_type = models.CharField(
        max_length=20, choices=MediaType.choices, default=MediaType.IMAGE
    )
    alt_text = models.CharField(max_length=300, blank=True)
    caption = models.CharField(max_length=500, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_gallery_visible = models.BooleanField(
        default=False,
        help_text="Show in Highlights gallery page",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "post media"
        ordering = ["order", "uploaded_at"]

    def __str__(self):
        return f"{self.get_media_type_display()}: {self.alt_text or self.post.title}"
