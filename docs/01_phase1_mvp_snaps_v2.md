**SHERWIN UNIVERSE**

Phase 1: MVP Skeleton + Snaps (Updated)

**v2 --- Updated with Snaps Feature**

April 2026

**Phase 1 Goal**

**Get the project running end-to-end AND let Sherwin create his first
Snap.** This phase delivers a working site with correct structure, a
kid-friendly Snap creation form, auto-publish with parent notification,
and deployment to Render. By the end, Sherwin should be able to open the
site on his phone, tap \'+\', take a photo, write a caption, and share
it.

> **CHANGED:** Phase 1 now includes the Snaps creation form and basic
> authentication. Previously this was just a skeleton with placeholder
> pages.

**What We Achieve**

-   Django project with all apps created and registered

-   PostgreSQL database connected (local dev + Render production)

-   Base template with responsive navigation featuring a prominent \'+\'
    (Create Snap) button

> **NEW:** Snaps creation form: a clean, kid-friendly front-end page for
> posting image + caption + tags
>
> **NEW:** Simple authentication for Sherwin (PIN or saved login, not
> the Django admin login)
>
> **NEW:** Auto-publish: Snaps go live immediately on creation
>
> **NEW:** Parent notification on new Snap (email with preview +
> take-down link)

-   All pages rendering: Home (shows Snaps feed), Timeline, Highlights,
    Lab, About (placeholders)

-   Tailwind CSS configured with mobile-first responsive layout

-   HTMX installed and working on the Snap form (image preview, tag
    selection)

-   Static files served via WhiteNoise

-   Media storage configured for Cloudflare R2 (django-storages)

-   Admin panel accessible with django-unfold theme

-   Basic security: CSRF, secure cookies, EXIF stripping on all uploaded
    images

-   CI/CD pipeline: GitHub Actions running ruff + pytest on every push

-   Deployment to Render with auto-deploy from main branch

-   Sentry error tracking integrated

> **CHANGED:** Blog (Journal) page exists in code but is hidden from
> navigation. Accessible only via direct URL or admin.

**The Snaps Creation Form**

This is the centerpiece of Phase 1. It must be simple enough that a kid
can use it without instructions.

**Form Layout (Mobile-First)**

The form is a single full-width page, scrollable, with large touch
targets:

1.  Image Upload Area: Takes up the top 60% of the screen. Shows a
    camera icon and \'Tap to add a photo\' text. After selection, shows
    a preview of the image filling the area. Supports tap-to-browse and
    drag-and-drop on desktop.

2.  Caption Field: A large text area below the image. Placeholder text:
    \'What did you make / discover / do?\' Max length: 500 characters.
    Character counter shown subtly. No rich text formatting --- just
    plain text.

3.  Tags: A horizontal scrollable row of pre-defined tag chips (Science,
    Art, Nature, Building, Cooking, Adventure, School, Fun). Tapping a
    chip toggles it on/off (highlighted when selected). A small \'+
    Add\' button at the end lets Sherwin type a custom tag.

4.  Share Button: A large, prominent button at the bottom. Disabled
    until an image is selected. Shows a brief success animation after
    posting.

**Pre-Defined Tag Set**

Start with these tags. They can be edited in the admin. The goal is to
cover Sherwin\'s likely activities without overwhelming him:

  --------- ----------- -------- ----------
  Science   Art         Nature   Building
  Cooking   Adventure   School   Fun
  --------- ----------- -------- ----------

**Technical Implementation**

-   Django view: POST to /snap/new/ creates a Post object with
    post\_type=\'snap\', status=\'published\'

-   Image upload: HTMX handles the preview without page reload. Image
    sent as multipart/form-data.

-   EXIF stripping: Applied immediately on upload before storage

-   Tags: Sent as a comma-separated string, processed via django-taggit

-   Title auto-generation: If Sherwin doesn\'t provide one, take the
    first 50 characters of the caption

-   After submit: Redirect to the home feed with the new Snap at the top
    and a success toast

-   Notification: Django signal on Post save (when post\_type=\'snap\'
    and status=\'published\') triggers an email to parent

**Authentication for Sherwin**

Sherwin needs to log in to post Snaps, but the experience must be
frictionless. Phase 1 implements the simplest viable option:

**Recommended: Device-Based PIN**

Sherwin sets a 4-6 digit PIN on first use. The PIN is verified against a
hashed value in the database (tied to his user account). Once
authenticated, the session persists for 30 days (configurable). The
login page shows a large keypad, not a text form. This is simple,
memorable for a kid, and doesn\'t require email or passwords.

**Parent Admin Access**

You (the parent) continue to use the standard Django admin with a full
username/password. The admin provides: viewing all Snaps,
editing/archiving Snaps, managing tags and categories, accessing the
hidden blog feature, and site configuration. django-unfold makes this
experience pleasant.

**User Model**

Two users in the system from day one:

-   Sherwin (is\_staff=False): Can create Snaps via the front-end form.
    PIN-authenticated.

-   Parent (is\_staff=True, is\_superuser=True): Full admin access.
    Password-authenticated.

**Parent Notification System**

When Sherwin publishes a Snap, an email is sent to the parent. Phase 1
keeps this simple:

**Email Content**

-   Subject: \'New Snap from Sherwin: \[first 40 chars of caption\]\'

-   Body: Thumbnail of the image, the caption, the tags, and two links:
    \'View on site\' and \'Archive this Snap\'

-   The archive link is a signed URL (Django\'s signing module) that
    changes the snap\'s status to \'archived\' without requiring admin
    login. One tap to moderate.

**Email Setup**

For Phase 1, use Django\'s built-in SMTP backend with a free Gmail app
password or SendGrid free tier (100 emails/day). This gets replaced with
a more robust notification system (including Telegram option) in Phase
4.

**Updated Project Structure**

**sherwin\_universe/**

-   manage.py

-   requirements/ (base.txt, dev.txt, prod.txt)

-   config/ (settings/, urls.py, wsgi.py)

-   config/settings/ (base.py, dev.py, prod.py, test.py)

-   apps/core/ (views, templates, static, templatetags, utils/exif.py)

-   apps/blog/ (models.py with post\_type field, views, admin, urls)

-   apps/snaps/ (views for creation form, templates for form + feed)

-   apps/gallery/ (placeholder)

-   apps/timeline/ (placeholder)

-   apps/miniapps/ (placeholder)

-   apps/accounts/ (PIN auth views, login template, user management)

-   apps/ai\_tools/ (empty, registered)

-   apps/notifications/ (email notification on snap publish)

-   templates/ (base.html, snaps/, includes/)

-   static/ (css/, js/, images/)

-   tests/ (conftest.py, factories.py, test\_snaps/, test\_accounts/)

-   .github/workflows/ (ci.yml)

-   render.yaml

> **CHANGED:** Added apps/snaps/ (creation form UI), apps/accounts/ (PIN
> auth), and apps/notifications/ (parent alerts). These were not in the
> original Phase 1.

**Decisions Needed Before Starting Phase 1**

Carry-over questions from the original spec, plus new ones for Snaps:

**Question 1: Domain & Hosting**

**Do you have a domain name?** Render provides a free .onrender.com
subdomain for now.

**Question 2: Python Version & Package Manager**

**Python 3.12+ with pip or uv?** uv is faster but newer.

**Question 3: CSS Framework**

**Tailwind CSS (assumed) or alternative?** This affects the Snap form\'s
look and feel.

**Question 4: Admin Theme**

**django-unfold, Grappelli, or default Django admin?**

**Question 5: Version Control**

**GitHub (assumed for CI/CD) or alternative?**

**Question 6: Local Development**

**Docker or virtualenv? Mac/Windows/Linux?**

**Question 7: Cloudflare R2**

**Set up R2 now or start with local media storage?**

**NEW Question 8: Sherwin\'s Authentication**

**PIN pad (recommended), saved browser password, or magic link?** PIN is
simplest for a kid. The PIN pad is a custom UI with large number
buttons. Password is standard but less fun. Magic link requires email
access.

**NEW Question 9: Notification Email**

**What email should receive Snap notifications?** And do you want to use
Gmail SMTP (simplest) or SendGrid free tier (more reliable, 100
emails/day)?

**NEW Question 10: Multiple Images per Snap?**

**Should a Snap allow multiple images (like a carousel), or strictly one
image per Snap?** One image is simpler and truer to the \'quick share\'
spirit. Multiple images could be added in Phase 2 if needed.
