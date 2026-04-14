from django.contrib.auth.decorators import login_required
from django.core import signing
from django.http import HttpResponseBadRequest
from django.shortcuts import get_object_or_404, redirect

from apps.blog.models import Post


def archive_snap(request, token):
    """One-tap archive from parent notification email (signed URL)."""
    try:
        data = signing.loads(token, max_age=60 * 60 * 24 * 7)  # 7 days
    except signing.BadSignature:
        return HttpResponseBadRequest("Invalid or expired link.")

    post = get_object_or_404(Post, pk=data["post_id"])
    post.status = Post.Status.ARCHIVED
    post.save(update_fields=["status"])
    return redirect("core:home")
