"""Lab telemetry ingestion endpoint."""

from __future__ import annotations

import json
import logging

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import LabEvent

logger = logging.getLogger(__name__)

# Hard caps to keep an unfriendly client from filling the table.
MAX_BODY_BYTES = 32 * 1024  # 32 KB per beacon
MAX_EVENTS_PER_BATCH = 50
MAX_PROPS_DEPTH = 4
MAX_PROPS_KEYS = 30
MAX_STRING_LEN = 500


def _sanitize_props(value, depth=0):
    """Trim/flatten incoming props so we never write garbage to the DB."""
    if depth > MAX_PROPS_DEPTH:
        return None
    if isinstance(value, dict):
        out = {}
        for i, (k, v) in enumerate(value.items()):
            if i >= MAX_PROPS_KEYS:
                break
            key = str(k)[:64]
            cleaned = _sanitize_props(v, depth + 1)
            if cleaned is not None:
                out[key] = cleaned
        return out
    if isinstance(value, list):
        return [_sanitize_props(v, depth + 1) for v in value[:MAX_PROPS_KEYS]]
    if isinstance(value, str):
        return value[:MAX_STRING_LEN]
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    return str(value)[:MAX_STRING_LEN]


@csrf_exempt  # Beacons fire on pagehide where CSRF cookies may not be available.
@require_POST
def ingest(request):
    """Accept a batch of telemetry events from the LabShell.

    Expected payload::

        {
          "session_id": "abc...",
          "events": [
            {"slug": "nuclear-decay", "event": "sim.opened", "props": {...}},
            ...
          ]
        }

    Returns 204 on success (sendBeacon ignores the response body anyway).
    """
    # Cap request size before we even parse JSON.
    if request.META.get("CONTENT_LENGTH"):
        try:
            if int(request.META["CONTENT_LENGTH"]) > MAX_BODY_BYTES:
                return HttpResponse(status=413)
        except (TypeError, ValueError):
            return HttpResponse(status=400)

    raw = request.body[:MAX_BODY_BYTES]
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "invalid_json"}, status=400)

    events = payload.get("events")
    if not isinstance(events, list) or not events:
        return JsonResponse({"error": "no_events"}, status=400)

    session_id = str(payload.get("session_id", ""))[: LabEvent.SESSION_MAX_LEN]

    rows = []
    for entry in events[:MAX_EVENTS_PER_BATCH]:
        if not isinstance(entry, dict):
            continue
        slug = str(entry.get("slug", ""))[: LabEvent.SLUG_MAX_LEN].strip()
        event = str(entry.get("event", ""))[: LabEvent.EVENT_MAX_LEN].strip()
        if not slug or not event:
            continue
        props = _sanitize_props(entry.get("props", {}))
        if not isinstance(props, dict):
            props = {}
        rows.append(
            LabEvent(
                slug=slug,
                event=event,
                props=props,
                session_id=session_id,
            )
        )

    if rows:
        try:
            LabEvent.objects.bulk_create(rows, batch_size=MAX_EVENTS_PER_BATCH)
        except Exception:
            logger.exception("Failed to persist lab telemetry batch")
            return HttpResponse(status=500)

    return HttpResponse(status=204)
