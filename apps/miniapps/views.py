from django.shortcuts import get_object_or_404, render

from .models import MiniApp


def lab(request):
    apps = MiniApp.objects.filter(is_active=True).select_related("category").order_by("name")
    return render(request, "pages/lab.html", {"miniapps": apps})


def miniapp_detail(request, slug):
    app = get_object_or_404(MiniApp, slug=slug, is_active=True)
    return render(request, app.get_template(), {"miniapp": app})
