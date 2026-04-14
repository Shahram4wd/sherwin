from django.urls import path

from . import views

app_name = "notifications"

urlpatterns = [
    path("archive/<str:token>/", views.archive_snap, name="archive_snap"),
]
