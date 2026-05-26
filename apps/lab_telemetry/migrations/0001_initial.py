from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="LabEvent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "slug",
                    models.CharField(
                        db_index=True,
                        help_text="Mini-app slug the event originated from.",
                        max_length=80,
                    ),
                ),
                (
                    "event",
                    models.CharField(
                        db_index=True,
                        help_text="Event name, e.g. 'sim.opened', 'sim.ai.message'.",
                        max_length=64,
                    ),
                ),
                (
                    "props",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Arbitrary, non-PII properties associated with the event.",
                    ),
                ),
                (
                    "session_id",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        default="",
                        help_text="Anonymous client-generated session id (per browser tab).",
                        max_length=64,
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, db_index=True),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="labevent",
            index=models.Index(fields=["slug", "event"], name="lab_telemet_slug_2ad1f1_idx"),
        ),
        migrations.AddIndex(
            model_name="labevent",
            index=models.Index(
                fields=["created_at", "event"], name="lab_telemet_created_14bd35_idx"
            ),
        ),
    ]
