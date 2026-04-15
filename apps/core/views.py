from django.core.paginator import Paginator
from django.db import models
from django.http import HttpResponse
from django.shortcuts import render

from taggit.models import Tag

from apps.accounts.models import UserProfile
from apps.blog.models import Post, PostMedia
from apps.timeline.models import TimelineEvent

from .models import AboutPage


def home(request):
    snaps_qs = Post.snaps.select_related("category", "created_by__profile").prefetch_related("tags", "media")

    tag = request.GET.get("tag")
    if tag:
        snaps_qs = snaps_qs.filter(tags__name__iexact=tag)

    paginator = Paginator(snaps_qs, 12)
    snaps = paginator.get_page(request.GET.get("page"))

    all_tags = Tag.objects.filter(
        taggit_taggeditem_items__content_type__model="post",
    ).distinct().order_by("name")

    about = AboutPage.load()
    profile = UserProfile.objects.select_related("user").first()

    return render(request, "pages/home.html", {
        "snaps": snaps,
        "current_tag": tag,
        "all_tags": all_tags,
        "about": about,
        "profile": profile,
    })


def about(request):
    about_page = AboutPage.load()
    profile = UserProfile.objects.select_related("user").first()
    return render(request, "pages/about.html", {"about": about_page, "profile": profile})


def robots_txt(request):
    lines = [
        "User-Agent: *",
        "Allow: /",
        "Sitemap: /sitemap.xml",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain")


def search(request):
    """HTMX-powered search - filters the snap feed inline.

    Uses PostgreSQL full-text search when available, falls back to icontains for SQLite.
    """
    query = request.GET.get("q", "").strip()
    if request.htmx:
        if query and len(query) >= 2:
            from django.db import connection

            if connection.vendor == "postgresql":
                from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector

                vector = SearchVector("title", weight="A") + SearchVector("body", weight="B") + SearchVector("summary", weight="C")
                search_query = SearchQuery(query, search_type="websearch")
                results = (
                    Post.published.annotate(rank=SearchRank(vector, search_query))
                    .filter(rank__gte=0.01)
                    .order_by("-rank")
                    .select_related("category", "created_by")
                    .prefetch_related("tags", "media")[:20]
                )
                if not results.exists():
                    results = (
                        Post.published.filter(
                            models.Q(title__icontains=query)
                            | models.Q(body__icontains=query)
                            | models.Q(tags__name__icontains=query)
                        )
                        .distinct()
                        .select_related("category", "created_by")
                        .prefetch_related("tags", "media")[:20]
                    )
            else:
                results = (
                    Post.published.filter(
                        models.Q(title__icontains=query)
                        | models.Q(body__icontains=query)
                        | models.Q(summary__icontains=query)
                        | models.Q(tags__name__icontains=query)
                    )
                    .distinct()
                    .select_related("category", "created_by")
                    .prefetch_related("tags", "media")[:20]
                )
            return render(
                request,
                "includes/search_results.html",
                {"snaps": results, "query": query},
            )
        # Empty query: return the normal feed
        snaps_qs = Post.snaps.select_related("category", "created_by").prefetch_related("tags", "media")
        paginator = Paginator(snaps_qs, 12)
        snaps = paginator.get_page(1)
        return render(request, "snaps/includes/snap_cards.html", {"snaps": snaps})
    return render(request, "pages/home.html")
