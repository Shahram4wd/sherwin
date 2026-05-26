from django.urls import path

from . import views

app_name = "lab_telemetry"

urlpatterns = [
    path("events/", views.ingest, name="ingest"),
]
