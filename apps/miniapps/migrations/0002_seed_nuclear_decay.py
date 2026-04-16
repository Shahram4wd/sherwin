from django.db import migrations


def seed_nuclear_decay_miniapp(apps, schema_editor):
    MiniAppCategory = apps.get_model("miniapps", "MiniAppCategory")
    MiniApp = apps.get_model("miniapps", "MiniApp")

    category, _ = MiniAppCategory.objects.update_or_create(
        slug="physics",
        defaults={"name": "Physics"},
    )

    MiniApp.objects.update_or_create(
        slug="nuclear-decay",
        defaults={
            "name": "Nuclear Decay Simulation",
            "description": (
                "Build nuclei with protons and neutrons, evaluate stability, "
                "and trigger radioactive decay modes in a 3D interactive simulation."
            ),
            "category": category,
            "template_name": "miniapps/nuclear-decay.html",
            "thumbnail": "",
            "is_active": True,
            "embed_url": "",
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("miniapps", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_nuclear_decay_miniapp, migrations.RunPython.noop),
    ]
