import io

import pytest
from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.urls import reverse
from PIL import Image

from apps.blog.models import Post


def _create_test_image():
    """Create a simple test image in memory."""
    buf = io.BytesIO()
    img = Image.new("RGB", (100, 100), color="red")
    img.save(buf, format="JPEG")
    buf.seek(0)
    buf.name = "test.jpg"
    return buf


class SnapCreateViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="sherwin", password="testpass")
        self.url = reverse("snaps:snap_create")

    def test_requires_login(self):
        response = self.client.get(self.url)
        assert response.status_code == 302
        assert "accounts/login" in response.url

    def test_get_form(self):
        self.client.login(username="sherwin", password="testpass")
        response = self.client.get(self.url)
        assert response.status_code == 200
        assert b"Share something" in response.content

    def test_create_snap_with_image(self):
        self.client.login(username="sherwin", password="testpass")
        image = _create_test_image()
        response = self.client.post(self.url, {
            "caption": "My test snap",
            "images": image,
            "tag_list": "Science,Fun",
        })
        assert response.status_code == 302
        snap = Post.objects.first()
        assert snap is not None
        assert snap.post_type == Post.PostType.SNAP
        assert snap.status == Post.Status.PUBLISHED
        assert snap.body == "My test snap"
        assert snap.created_by == self.user
        assert set(snap.tags.names()) == {"Science", "Fun"}

    def test_create_snap_without_image_fails(self):
        self.client.login(username="sherwin", password="testpass")
        response = self.client.post(self.url, {
            "caption": "No image",
            "tag_list": "",
        })
        assert response.status_code == 200  # re-renders form

    def test_create_snap_with_youtube_url(self):
        self.client.login(username="sherwin", password="testpass")
        response = self.client.post(self.url, {
            "caption": "Check this out",
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "tag_list": "Fun",
        })
        assert response.status_code == 302
        snap = Post.objects.first()
        assert snap is not None
        assert snap.youtube_url == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        assert snap.youtube_video_id == "dQw4w9WgXcQ"
        assert snap.body == "Check this out"

    def test_create_snap_invalid_youtube_url(self):
        self.client.login(username="sherwin", password="testpass")
        response = self.client.post(self.url, {
            "caption": "Bad link",
            "youtube_url": "https://www.example.com/video",
            "tag_list": "",
        })
        assert response.status_code == 200  # re-renders form with error

    def test_create_snap_without_caption(self):
        self.client.login(username="sherwin", password="testpass")
        image = _create_test_image()
        response = self.client.post(self.url, {
            "caption": "",
            "images": image,
            "tag_list": "",
        })
        assert response.status_code == 302
        snap = Post.objects.first()
        assert snap is not None
        assert snap.body == ""


class SnapFeedViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="sherwin", password="testpass")
        for i in range(3):
            Post.objects.create(
                title=f"Snap {i}",
                slug=f"snap-{i}",
                body=f"Caption {i}",
                post_type=Post.PostType.SNAP,
                status=Post.Status.PUBLISHED,
                created_by=self.user,
            )

    def test_home_feed(self):
        response = self.client.get(reverse("core:home"))
        assert response.status_code == 200
        assert b"Caption 0" in response.content

    def test_snap_feed_page(self):
        response = self.client.get(reverse("snaps:snap_feed"))
        assert response.status_code == 200


class SnapDetailViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="sherwin", password="testpass")
        self.snap = Post.objects.create(
            title="Test Snap",
            slug="test-snap",
            body="My caption",
            post_type=Post.PostType.SNAP,
            status=Post.Status.PUBLISHED,
            created_by=self.user,
        )

    def test_snap_detail(self):
        response = self.client.get(reverse("snaps:snap_detail", kwargs={"slug": "test-snap"}))
        assert response.status_code == 200
        assert b"My caption" in response.content

    def test_draft_snap_404(self):
        self.snap.status = Post.Status.DRAFT
        self.snap.save()
        response = self.client.get(reverse("snaps:snap_detail", kwargs={"slug": "test-snap"}))
        assert response.status_code == 404
