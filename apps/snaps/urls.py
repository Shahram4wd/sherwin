from django.urls import path

from . import views

app_name = "snaps"

urlpatterns = [
    path("new/", views.snap_create, name="snap_create"),
    path("", views.snap_feed, name="snap_feed"),
    path("<slug:slug>/", views.snap_detail, name="snap_detail"),
]
