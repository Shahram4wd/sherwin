"""Lab telemetry app.

Captures lightweight analytics events emitted by the LabShell (sim opens,
fullscreen toggles, AI usage, errors). Respects ``navigator.doNotTrack`` and
stores no PII beyond an anonymous session id sent by the client.
"""

default_app_config = "apps.lab_telemetry.apps.LabTelemetryConfig"
