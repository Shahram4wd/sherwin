from django.urls import path

from . import views
from .feeds import LatestPostsFeed

app_name = "blog"

urlpatterns = [
    path("", views.journal, name="journal"),
    path("feed/", LatestPostsFeed(), name="feed"),
    path("<slug:slug>/", views.post_detail, name="post_detail"),
]
