from django.db import models


class TimelineEvent(models.Model):
    class EventType(models.TextChoices):
        POST = "post", "Blog Post"
        MILESTONE = "milestone", "Milestone"
        BIRTHDAY = "birthday", "Birthday"
        CUSTOM = "custom", "Custom"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, help_text="Short text for the card")
    event_date = models.DateField()
    event_type = models.CharField(
        max_length=30, choices=EventType.choices, default=EventType.CUSTOM
    )
    linked_post = models.ForeignKey(
        "blog.Post",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timeline_events",
    )
    thumbnail = models.ImageField(
        upload_to="timeline/thumbs/%Y/",
        null=True,
        blank=True,
        help_text="Falls back to linked post image",
    )
    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text="CSS class for icon display",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-event_date"]

    def __str__(self):
        return self.title

    @property
    def display_thumbnail(self):
        if self.thumbnail:
            return self.thumbnail
        if self.linked_post and self.linked_post.featured_image:
            return self.linked_post.featured_image
        return None
