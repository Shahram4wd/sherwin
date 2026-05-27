from django.db import migrations


def set_tank_attack_thumbnail(apps, schema_editor):
    MiniApp = apps.get_model("miniapps", "MiniApp")

    MiniApp.objects.filter(slug="tank-attack-lab").update(thumbnail="tank.svg")


def restore_tank_attack_thumbnail(apps, schema_editor):
    MiniApp = apps.get_model("miniapps", "MiniApp")

    MiniApp.objects.filter(slug="tank-attack-lab").update(thumbnail="TANK")


class Migration(migrations.Migration):

    dependencies = [
        ("miniapps", "0006_seed_tank_attack_lab"),
    ]

    operations = [
        migrations.RunPython(set_tank_attack_thumbnail, restore_tank_attack_thumbnail),
    ]