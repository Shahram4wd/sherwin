from django.shortcuts import render


def lab(request):
    return render(request, "pages/lab.html")
