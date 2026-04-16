from django.db import models
from django.utils.text import slugify


class MiniAppCategory(models.Model):
    """Placeholder for Phase 3."""

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)

    class Meta:
        verbose_name_plural = "mini app categories"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class MiniApp(models.Model):
    """Interactive mini-app / simulation registered in the Lab."""

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    description = models.TextField(blank=True)
    category = models.ForeignKey(
        MiniAppCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="apps",
    )
    template_name = models.CharField(
        max_length=200,
        blank=True,
        help_text="Template path, e.g. 'miniapps/nuclear-decay.html'. "
        "Leave blank to use miniapps/<slug>.html.",
    )
    thumbnail = models.CharField(
        max_length=200,
        blank=True,
        help_text="Emoji or icon class shown on the lab card.",
    )
    is_active = models.BooleanField(default=True)
    embed_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_template(self):
        return self.template_name or f"miniapps/{self.slug}.html"

    def get_absolute_url(self):
        from django.urls import reverse

        return reverse("miniapps:miniapp_detail", kwargs={"slug": self.slug})
