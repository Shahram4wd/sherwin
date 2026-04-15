"""Generate LQIP placeholders for existing posts that have images but no LQIP."""

from django.core.management.base import BaseCommand

from apps.blog.models import Post


class Command(BaseCommand):
    help = "Generate LQIP blur placeholders for posts missing them."

    def handle(self, *args, **options):
        posts = Post.objects.filter(lqip="").exclude(featured_image="")
        total = posts.count()
        self.stdout.write(f"Found {total} posts needing LQIP generation.")

        updated = 0
        for post in posts.iterator():
            try:
                post._generate_lqip()
                if post.lqip:
                    Post.objects.filter(pk=post.pk).update(lqip=post.lqip)
                    updated += 1
            except Exception as e:
                self.stderr.write(f"  Failed for post {post.pk}: {e}")

        self.stdout.write(self.style.SUCCESS(f"Generated LQIP for {updated}/{total} posts."))
