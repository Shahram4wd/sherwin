from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.core.paginator import Paginator
from django.shortcuts import redirect, render
from django.utils import timezone

from apps.blog.models import Post
from apps.core.utils.exif import strip_exif

from .forms import SnapForm

# Pre-defined tags for the chip selector
DEFAULT_TAGS = ["Science", "Art", "Nature", "Building", "Cooking", "Adventure", "School", "Fun"]


@login_required(login_url="accounts:login")
def snap_create(request):
    """Kid-friendly Snap creation form."""
    if request.method == "POST":
        form = SnapForm(request.POST, request.FILES)
        if form.is_valid():
            # Strip EXIF from uploaded image
            image = form.cleaned_data["image"]
            try:
                clean_buf, fmt = strip_exif(image)
                ext = {"jpeg": "jpg", "png": "png", "webp": "webp", "gif": "gif"}.get(fmt, "jpg")
                name = f"snap_{timezone.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
                form.cleaned_data["image"] = InMemoryUploadedFile(
                    clean_buf, "image", name, f"image/{fmt}", clean_buf.getbuffer().nbytes, None
                )
            except Exception:
                pass  # If stripping fails, use original

            post = form.save(user=request.user)
            messages.success(request, "Snap shared!")
            return redirect("snaps:snap_detail", slug=post.slug)
    else:
        form = SnapForm()

    return render(request, "snaps/snap_form.html", {
        "form": form,
        "default_tags": DEFAULT_TAGS,
    })


def snap_feed(request):
    """Home feed of latest snaps."""
    snaps_qs = Post.snaps.select_related("category", "created_by").prefetch_related("tags")

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
    from django.shortcuts import get_object_or_404
    snap = get_object_or_404(
        Post.published.select_related("category", "created_by"),
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
