**SHERWIN UNIVERSE**

Project Roadmap & Phase Overview

**v2 --- Updated with Snaps Feature**

April 2026

**What Changed and Why**

**User testing with Sherwin revealed a critical UX insight:** he
doesn\'t want to write blog posts. He wants to share images with short
captions, like a social feed. This led to the introduction of **Snaps**
as the primary content type, with blog posts hidden until he\'s older.

Snaps are image-first, caption-second posts with optional tags. They
post from a simple, kid-friendly front-end form (not the admin panel).
They auto-publish immediately with a notification sent to the parent for
review. The blog feature remains in the architecture but is hidden from
navigation and the posting UI.

**Key Architectural Decision: Snaps vs. Blog**

Snaps are NOT a separate model. They are Posts with post\_type=\'snap\'.
This means the entire existing architecture (gallery, timeline, search,
AI, tags) works with Snaps without duplication. The Post model gains a
post\_type field with choices: \'snap\' (default), \'blog\' (hidden for
now), and potentially \'capsule\' (Phase 4).

This is important: by treating Snaps as a flavor of Post, we avoid
splitting the data model and having to maintain two parallel content
pipelines. The gallery still shows media from all published posts. The
timeline still auto-creates events. Search still indexes everything. The
only difference is the creation UI and how much content is required.

**Updated Phase Overview**

  ------------- ------------------------------------- ------------------- -----------------------------------------------------------------------------------
  **Phase**     **Name & Focus**                      **Duration Est.**   **Key Deliverable**
  **Phase 1**   MVP Skeleton + Snaps Form             1--2 weeks          Running site with Snaps posting form, placeholder pages, CI/CD, deployment
  **Phase 2**   Media Pipeline + Gallery + Timeline   3--4 weeks          Image processing, gallery with lightbox, timeline, home feed, about page, search
  **Phase 3**   AI Features + Mini Apps               4--6 weeks          AI tag suggestions on Snaps, alt text, mini app explainer, first interactive apps
  **Phase 4**   Polish, Blog Unlock & Extras          3--4 weeks          Semantic search, PWA, i18n, time capsules, blog mode unlock, content versioning
  ------------- ------------------------------------- ------------------- -----------------------------------------------------------------------------------

**Updated Navigation Structure**

The site navigation changes to reflect Snaps as the primary experience:

  ---------------- -------------- ---------------------- ----------------------------------------------------------------
  **Page**         **URL**        **Status**             **Description**
  Home             /              Active (Phase 2)       Feed of latest Snaps as cards + highlights
  Snaps (Create)   /snap/new/     Active (Phase 1)       Kid-friendly posting form. Big + button in nav.
  Timeline         /timeline/     Active (Phase 2)       Chronological view of all Snaps + milestones
  Highlights       /highlights/   Active (Phase 2)       Gallery grid of all images from Snaps
  Lab              /lab/          Active (Phase 3)       Interactive mini apps
  About            /about/        Active (Phase 2)       About Sherwin + the site
  Journal (Blog)   /journal/      Hidden until Phase 4   Full blog posts. Hidden from nav, accessible via admin toggle.
  ---------------- -------------- ---------------------- ----------------------------------------------------------------

The navigation now features a prominent \'Create Snap\' button (a + icon
or camera icon) that\'s always visible, making it effortless for Sherwin
to share something new.

**Updated Post Model**

The single most important data model change:

  --------------------- ------------------ ----------------------- ----------------------------------------------------------------------------------------------------
  **Field**             **Type**           **Constraints**         **Notes**
  **post\_type**        CharField(20)      default=\'snap\'        NEW: \'snap\' \| \'blog\' \| \'capsule\'. Controls which creation UI and display template is used.
  title                 CharField(200)     required                For snaps: auto-generated from first words of caption if not provided
  slug                  SlugField(200)     unique, auto            Auto-generated
  body                  TextField          blank OK                For snaps: this IS the caption (short). For blog: rich text (Phase 4).
  **featured\_image**   ImageField         required for snaps      CHANGED: Required for snaps, optional for blog posts
  status                CharField(20)      default=\'published\'   CHANGED: Snaps default to \'published\' (auto-publish). Blogs default to \'draft\'.
  tags                  TaggableManager    optional                Sherwin can add tags or skip them
  **created\_by**       ForeignKey(User)   required                NEW: Track who posted (Sherwin vs. parent). Useful for moderation.
  published\_at         DateTimeField      auto on publish         Set automatically when snap is created
  category              ForeignKey         nullable                Optional for snaps. Can be auto-inferred from tags later.
  --------------------- ------------------ ----------------------- ----------------------------------------------------------------------------------------------------

Highlighted rows indicate new or changed fields compared to the original
spec. The key insight: the same model serves both Snaps and Blog posts.
Managers filter by post\_type: Post.snaps.published() and
Post.blogs.published().

**Snaps Creation Flow**

This is the user experience when Sherwin creates a Snap:

1.  Sherwin taps the \'+\' button (always visible in the navigation bar)

2.  A clean, full-screen form appears with: a large image upload area
    (tap or drag), a caption text area (placeholder: \'What did you make
    / discover / do?\'), and a row of tag chips to tap (pre-defined +
    custom)

3.  He picks or takes a photo, types a few words, taps a couple of tags

4.  He hits the big \'Share\' button

5.  The snap is published immediately and appears on the home feed

6.  You (the parent) receive a notification (email or Telegram) with a
    preview and a one-tap \'Take down\' link if needed

**Moderation: Auto-Publish with Notification**

The moderation model is lightweight by design. Snaps go live immediately
because adding a review step would kill the joy of posting for a kid.
Instead, you receive a real-time notification with the snap content and
a direct link to unpublish it if something is wrong. This gives Sherwin
agency while keeping you in the loop.

The notification includes: the image (as a thumbnail), the caption text,
the tags, and two buttons --- \'View on site\' and \'Take down\'. The
take-down action sets the snap\'s status to \'archived\' and redirects
to the admin.

**Snap Authentication**

Sherwin needs to be logged in to create Snaps, but the login experience
should be frictionless. Options: (a) a simple PIN code on the device
(stored as a session), (b) a \'magic link\' sent to a parent-approved
email, or (c) a standard username/password that\'s saved in the browser.
The login page should be simple and kid-friendly, not the default Django
login form.

**Impact on Each Phase**

Here\'s a concise summary of what changes in each phase due to the Snaps
introduction:

**Phase 1 Changes**

-   Add post\_type field to the Post model skeleton

-   Build the Snaps creation form as a front-end page (not admin)

-   Add a simple authentication flow for Sherwin

-   Navigation shows Snaps (+) button prominently, hides Journal link

-   Snap form posts to a Django view that creates a Post with
    post\_type=\'snap\'

-   Basic notification on publish (can be a simple email via Django
    send\_mail for Phase 1)

**Phase 2 Changes**

-   Home page becomes a Snap feed (card grid of recent Snaps) instead of
    a blog listing

-   Gallery pulls images from Snaps (is\_gallery\_visible defaults to
    True for snaps)

-   Timeline auto-creates events from Snaps, not just blog posts

-   Image processing pipeline prioritized since every Snap has an image

-   Full-text search indexes snap captions and tags

-   Blog CRUD still built in admin but hidden from public navigation

**Phase 3 Changes**

-   AI tag suggestions triggered on Snap creation (from image + caption
    analysis)

-   AI alt text generation runs automatically on Snap image upload

-   AI draft generation repurposed: \'Turn these Snaps into a blog
    post\' feature for parent

-   Mini app Snaps: after using a mini app, Sherwin can \'Snap\' his
    creation with one tap

**Phase 4 Changes**

-   Blog mode unlock: admin toggle to show Journal in navigation when
    Sherwin is ready

-   \'Snap to Blog\' conversion: expand a Snap into a full blog post
    (AI-assisted)

-   Time capsules work with both Snaps and blog posts

-   Search covers Snaps by default, blog posts when unlocked
