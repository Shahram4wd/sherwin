import pytest
from apps.blog.models import Post, PostCategory


@pytest.mark.django_db
class TestPostCategory:
    def test_create_category(self):
        cat = PostCategory.objects.create(name="Science")
        assert cat.slug == "science"
        assert str(cat) == "Science"


@pytest.mark.django_db
class TestPost:
    def test_create_post(self):
        post = Post.objects.create(title="My First Post", body="Hello world")
        assert post.slug == "my-first-post"
        assert str(post) == "My First Post"
        assert post.status == Post.Status.PUBLISHED

    def test_post_with_category(self):
        cat = PostCategory.objects.create(name="Art")
        post = Post.objects.create(title="Art Project", category=cat)
        assert post.category == cat
