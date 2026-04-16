from django.urls import path

from . import views

app_name = "ai_tools"

urlpatterns = [
    path("assistant/", views.assistant_chat, name="assistant_chat"),
]
