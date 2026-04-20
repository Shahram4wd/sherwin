import pytest
from django.urls import reverse

from apps.miniapps.models import MiniApp, MiniAppCategory, MiniAppTag


@pytest.mark.django_db
class TestLabTagFiltering:
    def test_visible_tags_excludes_same_name_as_category(self):
        category = MiniAppCategory.objects.create(name="Physics", slug="physics")
        duplicate_tag = MiniAppTag.objects.create(name="Physics", slug="physics-tag")
        extra_tag = MiniAppTag.objects.create(name="Interactive", slug="interactive")
        miniapp = MiniApp.objects.create(name="Hydraulics", slug="hydraulics", category=category, is_active=True)
        miniapp.tags.add(duplicate_tag, extra_tag)

        assert [tag.name for tag in miniapp.visible_tags] == ["Interactive"]

    def test_filters_by_single_tag(self, client):
        category = MiniAppCategory.objects.create(name="Physics", slug="physics")
        physics_tag = MiniAppTag.objects.create(name="Physics", slug="physics")
        chemistry_tag = MiniAppTag.objects.create(name="Chemistry", slug="chemistry")

        matching = MiniApp.objects.create(
            name="Hydraulics Lab",
            slug="hydraulics-lab",
            category=category,
            is_active=True,
        )
        non_matching = MiniApp.objects.create(
            name="Chem Lab",
            slug="chem-lab",
            category=category,
            is_active=True,
        )
        matching.tags.add(physics_tag)
        non_matching.tags.add(chemistry_tag)

        response = client.get(reverse("miniapps:lab"), {"tag": ["physics"]})

        content = response.content.decode()
        assert response.status_code == 200
        assert "Hydraulics Lab" in content
        assert "Chem Lab" not in content

    def test_filters_by_multiple_tags_using_intersection(self, client):
        category = MiniAppCategory.objects.create(name="Science", slug="science")
        beginner = MiniAppTag.objects.create(name="Beginner", slug="beginner")
        physics = MiniAppTag.objects.create(name="Physics", slug="physics")

        both = MiniApp.objects.create(name="Both", slug="both", category=category, is_active=True)
        only_one = MiniApp.objects.create(name="Only One", slug="only-one", category=category, is_active=True)

        both.tags.add(beginner, physics)
        only_one.tags.add(beginner)

        response = client.get(reverse("miniapps:lab"), {"tag": ["beginner", "physics"]})

        content = response.content.decode()
        assert response.status_code == 200
        assert "Both" in content
        assert "Only One" not in content


@pytest.mark.django_db
class TestStaffTagManagementViews:
    def test_manage_tags_requires_staff(self, client, django_user_model):
        user = django_user_model.objects.create_user(username="learner", password="pass12345")
        client.force_login(user)

        response = client.get(reverse("miniapps:manage_tags"))

        assert response.status_code == 302
        assert reverse("accounts:login") in response.url

    def test_staff_can_create_tag(self, client, django_user_model):
        staff = django_user_model.objects.create_user(
            username="admin-user",
            password="pass12345",
            is_staff=True,
        )
        client.force_login(staff)

        response = client.post(
            reverse("miniapps:manage_tags"),
            {"name": "Kinematics", "slug": ""},
            follow=True,
        )

        assert response.status_code == 200
        assert MiniAppTag.objects.filter(name="Kinematics").exists()

    def test_staff_can_assign_and_remove_simulation_tags(self, client, django_user_model):
        staff = django_user_model.objects.create_user(
            username="tag-admin",
            password="pass12345",
            is_staff=True,
        )
        client.force_login(staff)

        category = MiniAppCategory.objects.create(name="Physics", slug="physics")
        simulation = MiniApp.objects.create(
            name="Nuclear Decay",
            slug="nuclear-decay",
            category=category,
            is_active=True,
        )
        physics = MiniAppTag.objects.create(name="Physics", slug="physics")
        chemistry = MiniAppTag.objects.create(name="Chemistry", slug="chemistry")

        assign_response = client.post(
            reverse("miniapps:edit_simulation_tags", kwargs={"slug": simulation.slug}),
            {"tags": [physics.pk, chemistry.pk]},
            follow=True,
        )
        simulation.refresh_from_db()

        assert assign_response.status_code == 200
        assert set(simulation.tags.values_list("slug", flat=True)) == {"physics", "chemistry"}

        remove_response = client.post(
            reverse("miniapps:edit_simulation_tags", kwargs={"slug": simulation.slug}),
            {"tags": [physics.pk]},
            follow=True,
        )
        simulation.refresh_from_db()

        assert remove_response.status_code == 200
        assert set(simulation.tags.values_list("slug", flat=True)) == {"physics"}
