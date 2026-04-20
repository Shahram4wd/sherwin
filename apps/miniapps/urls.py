from django.urls import path

from . import views

app_name = "miniapps"

urlpatterns = [
    path("", views.lab, name="lab"),
    path("manage/tags/", views.manage_tags, name="manage_tags"),
    path("manage/tags/<slug:slug>/", views.edit_tag, name="edit_tag"),
    path("manage/simulations/", views.manage_simulation_tags, name="manage_simulation_tags"),
    path("manage/simulations/<slug:slug>/tags/", views.edit_simulation_tags, name="edit_simulation_tags"),
    path("<slug:slug>/", views.miniapp_detail, name="miniapp_detail"),
]
