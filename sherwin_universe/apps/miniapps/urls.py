from django.urls import path

from . import views

app_name = "miniapps"

urlpatterns = [
    path("", views.lab, name="lab"),
]
