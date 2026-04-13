from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import Post


@receiver(pre_save, sender=Post)
def auto_create_timeline_event(sender, instance, **kwargs):
    """When a post transitions to published, auto-create a TimelineEvent if none exists."""
    if not instance.pk:
        return

    try:
        old = Post.objects.get(pk=instance.pk)
    except Post.DoesNotExist:
        return

    if (
        old.status != Post.Status.PUBLISHED
        and instance.status == Post.Status.PUBLISHED
        and not instance.timeline_events.exists()
    ):
        from apps.timeline.models import TimelineEvent

        TimelineEvent.objects.create(
            title=instance.title,
            description=instance.summary or "",
            event_date=(instance.published_at or instance.created_at).date(),
            event_type=TimelineEvent.EventType.POST,
            linked_post=instance,
        )
