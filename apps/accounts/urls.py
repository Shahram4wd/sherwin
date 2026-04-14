from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("login/", views.pin_login, name="login"),
    path("logout/", views.pin_logout, name="logout"),
]
