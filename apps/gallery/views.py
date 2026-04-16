
from django.core.paginator import Paginator
from django.shortcuts import render

from apps.blog.models import Post, PostMedia


def highlights(request):
    """Gallery page combining PostMedia items and Snap images."""
    # Get PostMedia gallery items
    media_qs = (
        PostMedia.objects.filter(is_gallery_visible=True)
        .select_related("post", "post__category")
        .order_by("-uploaded_at")
    )

    # Get snaps with images
    snaps_qs = (
        Post.snaps.exclude(featured_image="")
        .select_related("category", "created_by")
        .prefetch_related("tags")
    )

    # Filter by media type
    media_type = request.GET.get("type")
    if media_type == "image":
        media_qs = media_qs.filter(media_type="image")
    elif media_type == "video":
        media_qs = media_qs.filter(media_type="video")
        snaps_qs = Post.objects.none()  # Snaps are always images
    elif media_type == "snap":
        media_qs = PostMedia.objects.none()

    # Filter by tag
    tag = request.GET.get("tag")
    if tag:
        snaps_qs = snaps_qs.filter(tags__name__iexact=tag)

    # Build unified items list
    gallery_items = []
    for snap in snaps_qs:
        gallery_items.append({
            "type": "snap",
            "url": snap.featured_image.url if snap.featured_image else "",
            "alt": snap.body[:60] if snap.body else snap.title,
            "caption": snap.body,
            "link": snap.get_absolute_url(),
            "date": snap.published_at or snap.created_at,
            "tags": list(snap.tags.names()),
        })
    for item in media_qs:
        gallery_items.append({
            "type": item.media_type,
            "url": item.file.url if item.file else "",
            "alt": item.alt_text or item.caption or "",
            "caption": item.caption,
            "link": item.post.get_absolute_url() if item.post else "#",
            "date": item.uploaded_at,
            "tags": [],
        })

    # Sort all by date descending
    gallery_items.sort(key=lambda x: x["date"] or x["date"], reverse=True)

    paginator = Paginator(gallery_items, 16)
    page = paginator.get_page(request.GET.get("page"))

    context = {
        "gallery_items": page,
        "current_type": media_type,
        "current_tag": tag,
    }

    if request.htmx:
        return render(request, "gallery/includes/media_grid.html", context)

    return render(request, "pages/highlights.html", context)
