from django.db import models
from django.http import HttpResponse
from django.shortcuts import render
from django.utils.html import escape

from apps.blog.models import Post, PostMedia
from apps.timeline.models import TimelineEvent

from .models import AboutPage


def home(request):
    featured_post = (
        Post.published.filter(is_featured=True).select_related("category").first()
    )
    latest_posts = Post.published.select_related("category")[:6]
    recent_highlights = (
        PostMedia.objects.filter(is_gallery_visible=True)
        .select_related("post")
        .order_by("-uploaded_at")[:6]
    )
    recent_events = TimelineEvent.objects.select_related("linked_post")[:5]

    context = {
        "featured_post": featured_post,
        "latest_posts": latest_posts,
        "recent_highlights": recent_highlights,
        "recent_events": recent_events,
    }
    return render(request, "pages/home.html", context)


def about(request):
    about_page = AboutPage.load()
    return render(request, "pages/about.html", {"about": about_page})


def robots_txt(request):
    lines = [
        "User-Agent: *",
        "Allow: /",
        "Sitemap: /sitemap.xml",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain")


def search(request):
    """HTMX-powered search - returns partial HTML results."""
    query = request.GET.get("q", "").strip()
    if request.htmx:
        if query and len(query) >= 2:
            results = (
                Post.published.filter(
                    models.Q(title__icontains=query)
                    | models.Q(body__icontains=query)
                    | models.Q(summary__icontains=query)
                    | models.Q(tags__name__icontains=query)
                )
                .distinct()
                .select_related("category")[:5]
            )
            return render(
                request,
                "includes/search_results.html",
                {"results": results, "query": query},
            )
        return HttpResponse("")
    return render(request, "pages/home.html")
