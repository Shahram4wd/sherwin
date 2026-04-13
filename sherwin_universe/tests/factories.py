import factory
from apps.blog.models import Post, PostCategory


class PostCategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = PostCategory

    name = factory.Sequence(lambda n: f"Category {n}")
    slug = factory.Sequence(lambda n: f"category-{n}")


class PostFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Post

    title = factory.Sequence(lambda n: f"Test Post {n}")
    slug = factory.Sequence(lambda n: f"test-post-{n}")
    body = "Test body content"
    status = Post.Status.DRAFT
