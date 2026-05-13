from django.db import migrations


def seed_tank_attack_lab_miniapp(apps, schema_editor):
    MiniAppCategory = apps.get_model("miniapps", "MiniAppCategory")
    MiniApp = apps.get_model("miniapps", "MiniApp")

    category, _ = MiniAppCategory.objects.update_or_create(
        slug="physics-games",
        defaults={"name": "Physics Games"},
    )

    MiniApp.objects.update_or_create(
        slug="tank-attack-lab",
        defaults={
            "name": "Tank Attack Lab",
            "description": (
                "Command heavy artillery tanks and SPGs in a stationary siege simulation. "
                "Range-find dome bunkers, choose the right shell, tune heading and elevation, "
                "and survive endless rounds of return fire."
            ),
            "category": category,
            "template_name": "miniapps/tank-attack-lab.html",
            "thumbnail": "TANK",
            "is_active": True,
            "embed_url": "",
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("miniapps", "0005_seed_gravity_gunner"),
    ]

    operations = [
        migrations.RunPython(seed_tank_attack_lab_miniapp, migrations.RunPython.noop),
    ]
