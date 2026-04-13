from django.http import HttpResponse
from django.shortcuts import render
from django.utils.html import escape


def home(request):
    return render(request, "pages/home.html")


def about(request):
    return render(request, "pages/about.html")


def robots_txt(request):
    lines = [
        "User-Agent: *",
        "Allow: /",
        "Sitemap: /sitemap.xml",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain")


def search_placeholder(request):
    """HTMX-powered search placeholder - returns partial HTML."""
    query = request.GET.get("q", "").strip()
    if request.htmx:
        if query:
            safe_query = escape(query)
            return HttpResponse(
                f'<p class="text-gray-500 text-sm">Search for "<strong class="text-accent-400">{safe_query}</strong>" '
                f"coming in Phase 2...</p>"
            )
        return HttpResponse("")
    return render(request, "pages/home.html")
