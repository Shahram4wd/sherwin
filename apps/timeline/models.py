from django.db import models


class TimelineEvent(models.Model):
    """Placeholder for Phase 2."""

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    event_date = models.DateField()
    linked_post = models.ForeignKey(
        "blog.Post",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timeline_events",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-event_date"]

    def __str__(self):
        return self.title
