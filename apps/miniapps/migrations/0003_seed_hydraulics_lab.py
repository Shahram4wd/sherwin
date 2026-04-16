from django.db import migrations


def seed_hydraulics_lab_miniapp(apps, schema_editor):
    MiniAppCategory = apps.get_model("miniapps", "MiniAppCategory")
    MiniApp = apps.get_model("miniapps", "MiniApp")

    category, _ = MiniAppCategory.objects.update_or_create(
        slug="physics",
        defaults={"name": "Physics"},
    )

    MiniApp.objects.update_or_create(
        slug="hydraulics-lab",
        defaults={
            "name": "Hydraulics Lab",
            "description": (
                "Control a hydraulic press, compare real materials, monitor pressure over time, "
                "and learn how force, efficiency, and failure are connected."
            ),
            "category": category,
            "template_name": "miniapps/hydraulics-lab.html",
            "thumbnail": "🛠️",
            "is_active": True,
            "embed_url": "",
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("miniapps", "0002_seed_nuclear_decay"),
    ]

    operations = [
        migrations.RunPython(seed_hydraulics_lab_miniapp, migrations.RunPython.noop),
    ]