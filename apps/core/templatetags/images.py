from django import template

register = template.Library()


@register.inclusion_tag("includes/responsive_image.html")
def responsive_image(post, css_class="", alt="", loading="lazy", sizes="100vw"):
    """Render an image with srcset for responsive loading.

    Usage: {% responsive_image snap css_class="w-full" alt="My image" %}
    """
    return {
        "post": post,
        "css_class": css_class,
        "alt": alt or (post.body[:60] if post.body else "Image"),
        "loading": loading,
        "sizes": sizes,
    }
