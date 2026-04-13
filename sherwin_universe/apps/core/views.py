from django.http import HttpResponse
from django.shortcuts import render


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
            return HttpResponse(
                f'<p class="text-gray-500 text-sm">Search for "<strong>{query}</strong>" '
                f"coming in Phase 2...</p>"
            )
        return HttpResponse("")
    return render(request, "pages/home.html")
