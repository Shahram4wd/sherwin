from django.contrib import messages
from django.contrib.auth.decorators import user_passes_test
from django.shortcuts import get_object_or_404, redirect, render

from .forms import MiniAppTagAssignmentForm, MiniAppTagForm
from .models import MiniApp, MiniAppTag


staff_required = user_passes_test(
    lambda user: user.is_authenticated and user.is_staff,
    login_url="accounts:login",
)


def lab(request):
    selected_tag_slugs = request.GET.getlist("tag")
    apps = MiniApp.objects.filter(is_active=True).select_related("category").prefetch_related("tags").order_by("name")

    for slug in selected_tag_slugs:
        apps = apps.filter(tags__slug=slug)

    return render(
        request,
        "pages/lab.html",
        {
            "miniapps": apps,
            "all_tags": MiniAppTag.objects.order_by("name"),
            "selected_tag_slugs": selected_tag_slugs,
        },
    )


def miniapp_detail(request, slug):
    app = get_object_or_404(MiniApp, slug=slug, is_active=True)
    return render(request, app.get_template(), {"miniapp": app})


@staff_required
def manage_tags(request):
    if request.method == "POST":
        form = MiniAppTagForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Tag created.")
            return redirect("miniapps:manage_tags")
    else:
        form = MiniAppTagForm()

    return render(
        request,
        "miniapps/manage_tags.html",
        {
            "form": form,
            "tags": MiniAppTag.objects.order_by("name"),
        },
    )


@staff_required
def edit_tag(request, slug):
    tag = get_object_or_404(MiniAppTag, slug=slug)
    if request.method == "POST":
        form = MiniAppTagForm(request.POST, instance=tag)
        if form.is_valid():
            form.save()
            messages.success(request, "Tag updated.")
            return redirect("miniapps:manage_tags")
    else:
        form = MiniAppTagForm(instance=tag)

    return render(
        request,
        "miniapps/edit_tag.html",
        {
            "form": form,
            "tag": tag,
        },
    )


@staff_required
def manage_simulation_tags(request):
    apps = MiniApp.objects.select_related("category").prefetch_related("tags").order_by("name")
    return render(
        request,
        "miniapps/manage_simulation_tags.html",
        {
            "miniapps": apps,
        },
    )


@staff_required
def edit_simulation_tags(request, slug):
    miniapp = get_object_or_404(MiniApp, slug=slug)
    if request.method == "POST":
        form = MiniAppTagAssignmentForm(request.POST, instance=miniapp)
        if form.is_valid():
            form.save()
            messages.success(request, f"Updated tags for {miniapp.name}.")
            return redirect("miniapps:manage_simulation_tags")
    else:
        form = MiniAppTagAssignmentForm(instance=miniapp)

    return render(
        request,
        "miniapps/edit_simulation_tags.html",
        {
            "miniapp": miniapp,
            "form": form,
        },
    )
