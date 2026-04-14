**SHERWIN UNIVERSE**

Phase 4: Polish, Blog Unlock & Extras (Updated)

**v2 --- Updated with Snaps Feature**

April 2026

**Phase 4 Goal**

**Polish the Snaps experience, unlock the blog when Sherwin is ready,
and add the features that make the site a long-term family treasure.**
This phase adds semantic search across all Snaps, PWA for app-like
access, multi-language support, time capsules, content versioning, and
the ability to \'graduate\' from Snaps to blogging.

> **NEW:** Blog Mode Unlock: An admin toggle that reveals the Journal
> page and blog creation tools when Sherwin is ready for long-form
> writing.

**What We Achieve**

-   Semantic search across all Snaps and blog posts (pgvector)

-   Progressive Web App: installable on phones, offline Snap viewing

-   Multi-language support (i18n for UI, AI-assisted caption
    translation)

-   Content versioning for Snaps and blog posts (revision history)

> **NEW:** Blog Mode Unlock: Admin toggle to reveal Journal in
> navigation + blog creation form
>
> **NEW:** Snap-to-Blog graduation: Expand individual Snaps or groups of
> Snaps into full blog posts

-   Time Capsule: Snaps or posts with a future reveal date

-   Privacy-respecting analytics (Plausible or Umami)

-   Enhanced notification system (email + Telegram option)

-   Print/PDF export for timeline and Snap collections

-   Performance optimization: CDN, caching, Lighthouse \> 90

-   Accessibility audit (WCAG 2.1 AA)

-   Admin 2FA

> **NEW:** Family reactions: Emoji reactions on Snaps (if decided in
> Phase 2 Q5)

**Blog Mode Unlock**

This is the graceful transition from Snaps to blogging. When you decide
Sherwin is ready:

1.  Toggle \'Blog Mode\' in admin settings (a SiteConfiguration
    singleton model)

2.  The Journal link appears in navigation

3.  A new \'Write a Post\' option appears alongside \'Create a Snap\' in
    the \'+\' menu

4.  The blog creation form is a richer version of the Snap form: full
    rich text editor (TipTap), image gallery management, category
    selector, SEO fields

5.  Existing blog posts (created via admin or Snap-to-Blog conversion)
    become publicly visible

The Snap form stays available forever. Blogging is an addition, not a
replacement. Some days Sherwin will want to write; most days he\'ll just
snap.

**Snap-to-Blog Graduation**

Two ways to turn Snaps into blog posts:

-   **Single Snap expansion:** On any Snap, a \'Write more about this\'
    button opens the blog editor pre-filled with the Snap\'s image and
    caption as a starting point. Sherwin adds more text, images, or
    detail.

-   **Multi-Snap compilation:** Select multiple Snaps (from the admin or
    a \'Create Story\' UI) and the AI generates a draft blog post
    weaving them together. This is the Phase 3 Snap-to-Blog converter,
    now accessible to Sherwin (not just the parent) if blog mode is
    unlocked.

**Time Capsules with Snaps**

Time capsules now work with Snaps too. Sherwin can create a Snap with a
reveal date: \'Show this on my birthday next year.\' The Snap is stored
with status=\'capsule\' and a reveal\_at date. The timeline shows it as
a locked card with a countdown. When the date arrives, it auto-publishes
and the family gets a notification.

**Semantic Search**

Unchanged from original spec. pgvector stores embeddings for all content
(Snaps + blog posts). Snap captions tend to be short, so embeddings are
generated from: caption + tags + AI-generated alt text combined. This
gives the search engine more semantic signal to work with.

**PWA: Offline Snaps**

> **NEW:** Offline Snap creation: If Sherwin opens the app without
> internet, he can still create a Snap. The image and caption are stored
> locally (IndexedDB) and synced when connectivity returns. The service
> worker handles the queue.

This is particularly useful for outdoor adventures where there\'s no
signal. Sherwin captures moments in real-time and they upload later.

**Multi-Language with Snap Captions**

If family members speak different languages, AI can translate Snap
captions on-the-fly. The translation is stored alongside the original
(not replacing it). A language toggle in the UI shows the translated
version. This is especially meaningful for grandparents who may not read
English.

**Decisions Needed Before Starting Phase 4**

**Question 1: Search Model**

**OpenAI text-embedding-3-small, local model (all-MiniLM-L6-v2), or skip
semantic search?**

**Question 2: Languages**

**Which languages?** English only? English + Farsi? Others? RTL support
needed for Farsi.

**Question 3: Notification Channels**

**Email only, Telegram, or both?**

**Question 4: Time Capsule Privacy**

**Should capsules be visible to you (admin) before reveal, or truly
sealed?**

**Question 5: Analytics**

**Minimal (page views only), moderate (Umami self-hosted), or none?**

**Question 6: PDF Export Scope**

**Export options:** (a) Single Snap as a printable card, (b) Snap
collection as a photo book, (c) Timeline year as a memory book, (d) All
of the above?

**Question 7: Blog Mode Timing**

**When do you anticipate enabling blog mode?** This helps determine how
much to invest in the blog editor vs. the Snap experience. If blogging
is years away, we can keep it minimal for now.

**NEW Question 8: Offline Snap Priority**

**How important is offline Snap creation?** It\'s technically complex
(service worker + IndexedDB + sync queue). If Sherwin mostly posts from
home with WiFi, it may not be worth the effort in Phase 4. Could be a
Phase 5 stretch goal instead.
