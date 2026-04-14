import logging

from django.conf import settings
from django.core import signing
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.urls import reverse

logger = logging.getLogger(__name__)


def send_snap_notification(post):
    """Send parent notification email when a new Snap is published."""
    parent_email = getattr(settings, "PARENT_NOTIFICATION_EMAIL", None)
    if not parent_email:
        logger.info("PARENT_NOTIFICATION_EMAIL not set, skipping notification.")
        return

    # Generate signed archive URL
    archive_token = signing.dumps({"post_id": post.pk, "action": "archive"})
    site_url = getattr(settings, "SITE_URL", "http://localhost:8080")
    archive_url = f"{site_url}{reverse('notifications:archive_snap', args=[archive_token])}"
    view_url = f"{site_url}{post.get_absolute_url()}"

    subject = f"New Snap from Sherwin: {post.body[:40] if post.body else 'New photo'}"
    context = {
        "post": post,
        "archive_url": archive_url,
        "view_url": view_url,
    }

    try:
        html_body = render_to_string("notifications/snap_email.html", context)
        text_body = (
            f"Sherwin shared a new Snap!\n\n"
            f"{post.body or '(no caption)'}\n\n"
            f"View: {view_url}\n"
            f"Archive: {archive_url}\n"
        )
        send_mail(
            subject=subject,
            message=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[parent_email],
            html_message=html_body,
            fail_silently=True,
        )
        logger.info(f"Snap notification sent for post #{post.pk}")
    except Exception:
        logger.exception(f"Failed to send snap notification for post #{post.pk}")
