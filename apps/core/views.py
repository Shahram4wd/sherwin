from django.core.paginator import Paginator
from django.db import models
from django.http import HttpResponse
from django.shortcuts import render

from apps.blog.models import Post, PostMedia
from apps.timeline.models import TimelineEvent

from .models import AboutPage


def home(request):
    snaps_qs = Post.snaps.select_related("category", "created_by").prefetch_related("tags")

    tag = request.GET.get("tag")
    if tag:
        snaps_qs = snaps_qs.filter(tags__name__iexact=tag)

    paginator = Paginator(snaps_qs, 12)
    snaps = paginator.get_page(request.GET.get("page"))

    return render(request, "pages/home.html", {"snaps": snaps, "current_tag": tag})


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
