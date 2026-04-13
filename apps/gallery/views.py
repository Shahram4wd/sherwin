from django.core.paginator import Paginator
from django.shortcuts import render

from apps.blog.models import PostMedia


def highlights(request):
    media = (
        PostMedia.objects.filter(is_gallery_visible=True)
        .select_related("post", "post__category")
        .order_by("-uploaded_at")
    )

    # Filter by media type
    media_type = request.GET.get("type")
    if media_type in ("image", "video", "document"):
        media = media.filter(media_type=media_type)

    # Filter by category (from parent post)
    category = request.GET.get("category")
    if category:
        media = media.filter(post__category__slug=category)

    paginator = Paginator(media, 12)
    page = paginator.get_page(request.GET.get("page"))

    context = {
        "media_items": page,
        "current_type": media_type,
        "current_category": category,
    }

    if request.htmx:
        return render(request, "gallery/includes/media_grid.html", context)

    return render(request, "pages/highlights.html", context)
