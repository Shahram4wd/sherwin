from django.contrib.syndication.views import Feed
from django.urls import reverse

from .models import Post


class LatestPostsFeed(Feed):
    title = "Sherwin Universe — Latest Posts"
    link = "/journal/"
    description = "Latest stories, experiments, and adventures from Sherwin's Universe."

    def items(self):
        return Post.published.select_related("category")[:10]

    def item_title(self, item):
        return item.title

    def item_description(self, item):
        return item.summary or item.body[:300]

    def item_link(self, item):
        return item.get_absolute_url()

    def item_pubdate(self, item):
        return item.published_at
