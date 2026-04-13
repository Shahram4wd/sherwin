from django.contrib.sitemaps import Sitemap
from django.urls import reverse

from apps.blog.models import Post


class StaticViewSitemap(Sitemap):
    priority = 0.5
    changefreq = "weekly"

    def items(self):
        return ["core:home", "core:about", "blog:journal", "timeline:timeline", "gallery:highlights"]

    def location(self, item):
        return reverse(item)


class PostSitemap(Sitemap):
    changefreq = "monthly"
    priority = 0.7

    def items(self):
        return Post.published.all()

    def lastmod(self, obj):
        return obj.updated_at

    def location(self, obj):
        return obj.get_absolute_url()
