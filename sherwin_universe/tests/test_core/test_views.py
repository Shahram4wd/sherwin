import pytest
from django.test import Client
from django.urls import reverse


@pytest.mark.django_db
class TestCoreViews:
    def setup_method(self):
        self.client = Client()

    def test_home_page(self):
        response = self.client.get(reverse("core:home"))
        assert response.status_code == 200
        assert b"Sherwin" in response.content

    def test_about_page(self):
        response = self.client.get(reverse("core:about"))
        assert response.status_code == 200
        assert b"About" in response.content

    def test_robots_txt(self):
        response = self.client.get(reverse("core:robots_txt"))
        assert response.status_code == 200
        assert response["Content-Type"] == "text/plain"
        assert b"User-Agent" in response.content

    def test_search_placeholder_no_htmx(self):
        response = self.client.get(reverse("core:search"))
        assert response.status_code == 200

    def test_search_placeholder_htmx(self):
        response = self.client.get(
            reverse("core:search") + "?q=test",
            HTTP_HX_REQUEST="true",
        )
        assert response.status_code == 200
        assert b"test" in response.content


@pytest.mark.django_db
class TestPlaceholderPages:
    def setup_method(self):
        self.client = Client()

    def test_journal_page(self):
        response = self.client.get(reverse("blog:journal"))
        assert response.status_code == 200

    def test_timeline_page(self):
        response = self.client.get(reverse("timeline:timeline"))
        assert response.status_code == 200

    def test_highlights_page(self):
        response = self.client.get(reverse("gallery:highlights"))
        assert response.status_code == 200

    def test_lab_page(self):
        response = self.client.get(reverse("miniapps:lab"))
        assert response.status_code == 200
