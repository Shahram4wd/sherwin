from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.blog.models import Post

from .email import send_snap_notification


@receiver(post_save, sender=Post)
def notify_parent_on_snap(sender, instance, created, **kwargs):
    """Send parent email when a new Snap is published."""
    if (
        created
        and instance.post_type == Post.PostType.SNAP
        and instance.status == Post.Status.PUBLISHED
    ):
        send_snap_notification(instance)
