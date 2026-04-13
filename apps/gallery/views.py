from django.shortcuts import render


def highlights(request):
    return render(request, "pages/highlights.html")
