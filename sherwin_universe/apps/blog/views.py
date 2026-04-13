from django.shortcuts import render


def journal(request):
    return render(request, "pages/journal.html")
