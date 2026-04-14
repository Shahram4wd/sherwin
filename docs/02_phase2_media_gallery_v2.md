**SHERWIN UNIVERSE**

Phase 2: Media Pipeline + Gallery + Timeline (Updated)

**v2 --- Updated with Snaps Feature**

April 2026

**Phase 2 Goal**

**Build the visual backbone of the site.** By the end of Phase 2, the
home page shows a beautiful feed of Sherwin\'s Snaps, the gallery lets
family browse all photos with filtering and a lightbox, the timeline
tells the story chronologically, and the image processing pipeline
ensures fast loads and child safety.

> **CHANGED:** Phase 2 now focuses on the Snap feed experience rather
> than blog CRUD. Blog editing remains admin-only and hidden. The
> gallery, timeline, and home page all center on Snaps as the primary
> content.

**What We Achieve**

-   Home page: A Snap feed showing latest content as cards (image +
    caption + tags + date)

> **NEW:** Snap detail page: Full-screen image view with caption, tags,
> date, and \'related Snaps\' section

-   Image processing pipeline: EXIF stripping, thumbnails (3 sizes),
    WebP conversion, responsive srcset

-   Gallery (Highlights) page: Filterable grid of all Snap images with
    lightbox viewer

-   Timeline page: Year-based navigation, auto-populated from Snaps +
    manual milestones

-   About page: Editable via admin (singleton model)

-   Full-text search using PostgreSQL SearchVector (searches snap
    captions and tags)

-   RSS feed for Snaps (django.contrib.syndication)

-   SEO: Open Graph tags with Snap image as og:image, JSON-LD,
    auto-generated sitemap

-   End-to-end tests with Playwright for: creating a Snap, browsing
    gallery, viewing timeline

> **CHANGED:** Blog CRUD exists in admin but is hidden from public
> navigation. Rich text editor setup deferred to Phase 4 blog unlock.
>
> **NEW:** Multi-image Snaps support (if decided in Phase 1 Question 10)
> with swipeable carousel
>
> **NEW:** Infinite scroll on home feed and gallery using HTMX

**Home Page: The Snap Feed**

The home page is no longer a traditional landing page. It\'s a social
feed of Sherwin\'s Snaps, newest first. Each Snap card shows:

-   The featured image (responsive, lazy-loaded, with blur-up
    placeholder)

-   The caption (truncated to 2 lines on the card, full on detail page)

-   Tag chips (clickable, filter the feed)

-   Relative timestamp (\'2 hours ago\', \'Yesterday\', \'March 15\')

-   A subtle link to the full Snap detail page

The feed uses HTMX infinite scroll: as the user scrolls near the bottom,
the next batch of Snaps loads automatically. Cards are rendered
server-side as HTMX partials.

**Image Processing Pipeline**

Unchanged from the original spec. Every image goes through: EXIF
stripping, format detection, thumbnail generation (300px, 800px, 1200px
via django-imagekit), WebP conversion, responsive srcset in templates,
and lazy loading with blur-up placeholders. This is even more critical
now since every Snap has at least one image.

**Gallery (Highlights)**

The gallery pulls all images from published Snaps where
is\_gallery\_visible=True (default). No changes to the filtering or
lightbox spec. The gallery now has more content to work with since Snaps
are image-first.

**Timeline**

The timeline auto-creates an event for every published Snap. The
event\_type is \'snap\' (new value). Timeline cards for Snaps show the
image thumbnail and caption. Admin can still create manual milestone
events for birthdays, achievements, etc.

**Decisions Needed Before Starting Phase 2**

**Question 1: Navigation Pattern (Mobile)**

**Bottom tab bar, hamburger menu, or side drawer?** With Snaps, a bottom
tab bar works well: Home \| Highlights \| + (Create) \| Timeline \| Lab.
The \'+\' sits prominently in the center.

**Question 2: Snap Card Design**

**How should Snap cards look on the home feed?** (a) Instagram-style:
full-width image with caption below, (b) Pinterest-style: masonry grid
with varying heights, (c) Simple list: small thumbnail + caption side by
side. This is a visual design decision that affects the whole site\'s
feel.

**Question 3: Gallery Organization**

**Should the gallery be flat (all images) or organized?** (a) Flat grid
with tag/date filters, (b) Grouped by month (\'March 2026\', \'February
2026\'), (c) Grouped by tag/category. This can always change later but
affects the initial implementation.

**Question 4: Timeline Density**

**Should every Snap appear on the timeline, or only highlighted ones?**
If Sherwin posts daily, the timeline could get crowded. Options: (a)
Every Snap (full history), (b) Only Snaps you mark as timeline-worthy in
admin, (c) Auto-select (e.g., first Snap of each week + milestones).

**Question 5: Comments (Revisited)**

**With Snaps as the primary content, do family members get to react or
comment?** (a) No reactions (simplest), (b) Simple emoji reactions
(heart, star, wow) without text comments, (c) Family-only text comments
(requires family auth). Emoji reactions are a nice middle ground --- low
moderation risk, high engagement.

**Question 6: Content Categories**

**What initial categories do you want?** These can supplement or replace
tags for broader grouping: Science, Art, Projects, Milestones,
Adventures, Learning. Or should we rely solely on tags and skip
categories?
