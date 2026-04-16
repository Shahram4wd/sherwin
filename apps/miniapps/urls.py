from django.urls import path

from . import views

app_name = "miniapps"

urlpatterns = [
    path("", views.lab, name="lab"),
    path("<slug:slug>/", views.miniapp_detail, name="miniapp_detail"),
]
