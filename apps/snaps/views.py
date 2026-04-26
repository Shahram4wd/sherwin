from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.contenttypes.models import ContentType
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.core.paginator import Paginator
from django.db.models import Count
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from apps.blog.models import Post
from apps.core.utils.exif import strip_exif

from .forms import SnapForm

FALLBACK_TAGS = ["Science", "Art", "Nature", "Building", "Cooking", "Adventure", "School", "Fun"]


def get_popular_snap_tags(*, include=None):
    """Return all snap tags ordered by usage count, then name."""
    include = {t.strip() for t in (include or []) if t and t.strip()}
    post_ct = ContentType.objects.get_for_model(Post)
    through = Post.tags.through

    tag_counts = (
        through.objects
        .filter(content_type=post_ct, object_id__in=Post.snaps.values("id"))
        .values("tag__name")
        .annotate(usage_count=Count("tag_id"))
        .order_by("-usage_count", "tag__name")
    )

    tags = []
    seen = set()
    seen_lower = set()
    for row in tag_counts:
        name = row["tag__name"]
        if not name or name.lower() in seen_lower:
            continue
        tags.append(name)
        seen.add(name)
        seen_lower.add(name.lower())

    for name in sorted(include, key=str.lower):
        if name.lower() not in seen_lower:
            tags.append(name)
            seen.add(name)
            seen_lower.add(name.lower())

    # Keep the original baseline tags available even if they are not yet popular.
    for name in FALLBACK_TAGS:
        if name.lower() not in seen_lower:
            tags.append(name)
            seen.add(name)
            seen_lower.add(name.lower())

    if not tags:
        tags = FALLBACK_TAGS
    return tags


@login_required(login_url="accounts:login")
def snap_create(request):
    """Kid-friendly Snap creation form."""
    if request.method == "POST":
        form = SnapForm(request.POST, request.FILES)
        if form.is_valid():
            # Collect all uploaded images (cleaned_data['images'] is a list)
            files = form.cleaned_data.get("images") or []
            cleaned_files = []
            for f in files:
                try:
                    clean_buf, fmt = strip_exif(f)
                    ext = {"jpeg": "jpg", "png": "png", "webp": "webp", "gif": "gif"}.get(fmt, "jpg")
                    name = f"snap_{timezone.now().strftime('%Y%m%d_%H%M%S')}_{len(cleaned_files)}.{ext}"
                    cleaned_files.append(InMemoryUploadedFile(
                        clean_buf, "images", name, f"image/{fmt}", clean_buf.getbuffer().nbytes, None
                    ))
                except Exception:
                    cleaned_files.append(f)

            # First image → featured_image, rest → PostMedia
            if cleaned_files:
                form.cleaned_data["images"] = cleaned_files[0]
                extra_images = cleaned_files[1:] if len(cleaned_files) > 1 else None
            else:
                form.cleaned_data["images"] = None
                extra_images = None

            post = form.save(user=request.user, extra_images=extra_images)
            messages.success(request, "Snap shared!")
            return redirect("snaps:snap_detail", slug=post.slug)
    else:
        form = SnapForm()

    return render(request, "snaps/snap_form.html", {
        "form": form,
        "default_tags": get_popular_snap_tags(),
    })


@login_required(login_url="accounts:login")
def snap_edit(request, slug):
    """Edit an existing snap."""
    snap = get_object_or_404(Post.published, slug=slug)

    if request.method == "POST":
        form = SnapForm(request.POST, request.FILES, instance=snap)
        if form.is_valid():
            files = form.cleaned_data.get("images") or []
            cleaned_files = []
            for f in files:
                try:
                    clean_buf, fmt = strip_exif(f)
                    ext = {"jpeg": "jpg", "png": "png", "webp": "webp", "gif": "gif"}.get(fmt, "jpg")
                    name = f"snap_{timezone.now().strftime('%Y%m%d_%H%M%S')}_{len(cleaned_files)}.{ext}"
                    cleaned_files.append(InMemoryUploadedFile(
                        clean_buf, "images", name, f"image/{fmt}", clean_buf.getbuffer().nbytes, None
                    ))
                except Exception:
                    cleaned_files.append(f)

            if cleaned_files:
                form.cleaned_data["images"] = cleaned_files[0]
                extra_images = cleaned_files[1:] if len(cleaned_files) > 1 else None
            else:
                form.cleaned_data["images"] = None
                extra_images = None

            post = form.save(extra_images=extra_images)
            messages.success(request, "Snap updated!")
            return redirect("snaps:snap_detail", slug=post.slug)
    else:
        form = SnapForm(instance=snap, initial={
            "caption": snap.body,
            "youtube_url": snap.youtube_url,
            "tag_list": ",".join(snap.tags.names()),
        })

    return render(request, "snaps/snap_form.html", {
        "form": form,
        "snap": snap,
        "editing": True,
        "default_tags": get_popular_snap_tags(include=snap.tags.names()),
    })


def snap_feed(request):
    """Home feed of latest snaps."""
    snaps_qs = Post.snaps.select_related("category", "created_by").prefetch_related("tags", "media")

    tag = request.GET.get("tag")
    if tag:
        snaps_qs = snaps_qs.filter(tags__name__iexact=tag)

    paginator = Paginator(snaps_qs, 12)
    page = paginator.get_page(request.GET.get("page"))

    if request.htmx:
        return render(request, "snaps/includes/snap_cards.html", {"snaps": page})

    return render(request, "snaps/snap_feed.html", {
        "snaps": page,
        "current_tag": tag,
    })


def snap_detail(request, slug):
    """Detail view for a single snap."""
    snap = get_object_or_404(
        Post.published.select_related("category", "created_by").prefetch_related("media"),
        slug=slug,
    )
    related = (
        Post.snaps.exclude(pk=snap.pk)
        .select_related("category")[:4]
    )
    return render(request, "snaps/snap_detail.html", {
        "snap": snap,
        "related_snaps": related,
    })


@login_required(login_url="accounts:login")
@require_POST
def snap_delete(request, slug):
    """Delete a snap."""
    snap = get_object_or_404(Post.published, slug=slug)
    snap.delete()
    messages.success(request, "Snap deleted!")
    return redirect("core:home")
