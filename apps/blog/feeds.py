from django.contrib.syndication.views import Feed

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


class LatestSnapsFeed(Feed):
    title = "Sherwin Universe — Latest Snaps"
    link = "/"
    description = "Sherwin's latest snaps — discoveries, creations, and adventures."

    def items(self):
        return Post.snaps.select_related("created_by")[:20]

    def item_title(self, item):
        return item.title

    def item_description(self, item):
        desc = item.body or ""
        if item.featured_image:
            desc = f'<img src="{item.featured_image.url}" alt="{item.title}"><br>{desc}'
        return desc

    def item_link(self, item):
        return item.get_absolute_url()

    def item_pubdate(self, item):
        return item.published_at
