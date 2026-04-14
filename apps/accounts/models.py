from django.conf import settings
from django.db import models


class PinProfile(models.Model):
    """Stores a hashed PIN for kid-friendly authentication."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pin_profile",
    )
    pin_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"PIN for {self.user.username}"

    def set_pin(self, raw_pin):
        from django.contrib.auth.hashers import make_password
        self.pin_hash = make_password(raw_pin)

    def check_pin(self, raw_pin):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_pin, self.pin_hash)
