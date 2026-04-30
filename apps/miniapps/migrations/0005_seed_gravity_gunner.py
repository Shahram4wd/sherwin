from django.db import migrations


def seed_gravity_gunner(apps, schema_editor):
    MiniAppCategory = apps.get_model("miniapps", "MiniAppCategory")
    MiniApp = apps.get_model("miniapps", "MiniApp")

    category, _ = MiniAppCategory.objects.update_or_create(
        slug="physics-games",
        defaults={"name": "Physics Games"},
    )

    MiniApp.objects.update_or_create(
        slug="gravity-gunner",
        defaults={
            "name": "Gravity Gunner",
            "description": (
                "Aim a spaceship cannon and curve shots through moving gravity fields. "
                "Drag to charge and aim, release to fire. Bend your shots around "
                "gravity planets and repulsor stars to destroy enemy scouts before "
                "your shield reaches zero."
            ),
            "category": category,
            "template_name": "miniapps/gravity-gunner.html",
            "thumbnail": "🚀",
            "is_active": True,
            "embed_url": "",
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("miniapps", "0004_miniapptag_and_miniapp_tags"),
    ]

    operations = [
        migrations.RunPython(seed_gravity_gunner, migrations.RunPython.noop),
    ]
