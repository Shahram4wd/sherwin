from django.db import models


class AboutPage(models.Model):
    """Singleton model for the About page content, editable via admin."""

    title = models.CharField(max_length=200, default="About Sherwin")
    subtitle = models.CharField(max_length=300, blank=True, help_text="Short tagline shown on profile card")
    body = models.TextField(blank=True)
    profile_photo = models.ImageField(upload_to="about/", blank=True, help_text="Profile photo for the sidebar card")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "About Page"
        verbose_name_plural = "About Page"

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        # Enforce singleton: always use pk=1
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
