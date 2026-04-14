from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.urls import reverse

from apps.accounts.models import PinProfile


class PinProfileModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="sherwin", password="testpass")
        self.profile = PinProfile.objects.create(user=self.user)

    def test_set_and_check_pin(self):
        self.profile.set_pin("1234")
        self.profile.save()
        assert self.profile.check_pin("1234") is True
        assert self.profile.check_pin("0000") is False

    def test_pin_is_hashed(self):
        self.profile.set_pin("5678")
        assert self.profile.pin_hash != "5678"
        assert len(self.profile.pin_hash) > 10


class PinLoginViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="sherwin", password="testpass", is_staff=False)
        self.profile = PinProfile.objects.create(user=self.user)
        self.profile.set_pin("1234")
        self.profile.save()
        self.url = reverse("accounts:login")

    def test_login_page_renders(self):
        response = self.client.get(self.url)
        assert response.status_code == 200

    def test_correct_pin_logs_in(self):
        response = self.client.post(self.url, {"pin": "1234"})
        assert response.status_code == 302
        assert response.url == reverse("core:home")

    def test_wrong_pin_rejected(self):
        response = self.client.post(self.url, {"pin": "0000"})
        assert response.status_code == 200  # re-renders form with error

    def test_logout(self):
        self.client.post(self.url, {"pin": "1234"})
        response = self.client.get(reverse("accounts:logout"))
        assert response.status_code == 302
