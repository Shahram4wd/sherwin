from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404, render

from .models import Post, PostCategory


def journal(request):
    posts = Post.published.select_related("category").prefetch_related("tags")

    # Filter by category
    category_slug = request.GET.get("category")
    category = None
    if category_slug:
        category = get_object_or_404(PostCategory, slug=category_slug)
        posts = posts.filter(category=category)

    # Filter by tag
    tag = request.GET.get("tag")
    if tag:
        posts = posts.filter(tags__slug=tag)

    paginator = Paginator(posts, 9)
    page = paginator.get_page(request.GET.get("page"))

    categories = PostCategory.objects.all()

    context = {
        "posts": page,
        "categories": categories,
        "current_category": category,
        "current_tag": tag,
    }

    if request.htmx:
        return render(request, "blog/includes/post_list.html", context)

    return render(request, "pages/journal.html", context)


def post_detail(request, slug):
    post = get_object_or_404(
        Post.published.select_related("category").prefetch_related("tags", "media"),
        slug=slug,
    )

    # Related posts: same category, exclude current
    related_posts = (
        Post.published.filter(category=post.category)
        .exclude(pk=post.pk)
        .select_related("category")[:3]
        if post.category
        else Post.published.exclude(pk=post.pk)[:3]
    )

    media_items = post.media.all()

    context = {
        "post": post,
        "related_posts": related_posts,
        "media_items": media_items,
    }
    return render(request, "blog/post_detail.html", context)
