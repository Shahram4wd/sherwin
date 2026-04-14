from django.contrib.auth import login, logout
from django.shortcuts import redirect, render

from .forms import PinLoginForm
from .models import PinProfile


def pin_login(request):
    """Kid-friendly PIN login page with large keypad."""
    if request.user.is_authenticated:
        return redirect("core:home")

    error = None
    if request.method == "POST":
        form = PinLoginForm(request.POST)
        if form.is_valid():
            pin = form.cleaned_data["pin"]
            try:
                profile = PinProfile.objects.select_related("user").get(
                    user__is_staff=False
                )
                if profile.check_pin(pin):
                    login(request, profile.user)
                    request.session.set_expiry(60 * 60 * 24 * 30)  # 30 days
                    next_url = request.GET.get("next", "core:home")
                    return redirect(next_url)
                else:
                    error = "Wrong PIN. Try again!"
            except PinProfile.DoesNotExist:
                error = "No PIN set up yet. Ask a parent."
        else:
            error = "Enter a 4-6 digit PIN."
    else:
        form = PinLoginForm()

    return render(request, "accounts/pin_login.html", {"form": form, "error": error})


def pin_logout(request):
    logout(request)
    return redirect("core:home")
