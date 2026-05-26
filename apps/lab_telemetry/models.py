from django.db import models


class LabEvent(models.Model):
    """A single LabShell-emitted event.

    Designed to be cheap to insert and easy to aggregate later. No PII is
    stored: the optional ``session_id`` is a client-generated random token
    scoped to a single browser session.
    """

    EVENT_MAX_LEN = 64
    SLUG_MAX_LEN = 80
    SESSION_MAX_LEN = 64

    slug = models.CharField(
        max_length=SLUG_MAX_LEN,
        db_index=True,
        help_text="Mini-app slug the event originated from.",
    )
    event = models.CharField(
        max_length=EVENT_MAX_LEN,
        db_index=True,
        help_text="Event name, e.g. 'sim.opened', 'sim.ai.message'.",
    )
    props = models.JSONField(
        default=dict,
        blank=True,
        help_text="Arbitrary, non-PII properties associated with the event.",
    )
    session_id = models.CharField(
        max_length=SESSION_MAX_LEN,
        blank=True,
        default="",
        db_index=True,
        help_text="Anonymous client-generated session id (per browser tab).",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["slug", "event"]),
            models.Index(fields=["created_at", "event"]),
        ]

    def __str__(self):
        return f"{self.slug}:{self.event} @ {self.created_at:%Y-%m-%d %H:%M:%S}"
