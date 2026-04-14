**SHERWIN UNIVERSE**

Phase 3: AI Features + Mini Apps (Updated)

**v2 --- Updated with Snaps Feature**

April 2026

**Phase 3 Goal**

**Add intelligence to Snaps and interactivity to the Lab.** AI features
now focus on making the Snap experience smarter: auto-suggesting tags
from the image and caption, generating alt text for accessibility, and a
new \'Snap to Blog\' converter for when you want to expand a quick share
into a full post. Mini apps let Sherwin explore science and creativity
interactively.

> **CHANGED:** AI features pivot from blog-first to Snap-first. Draft
> generation becomes \'Snap to Blog\' conversion. Tag suggestion
> triggers on Snap creation, not blog editing.

**What We Achieve**

**AI Features**

> **NEW:** Smart tag suggestions on Snap creation: AI analyzes the image
> + caption and pre-selects relevant tags
>
> **NEW:** Auto alt text: Every Snap image gets AI-generated alt text on
> upload (runs in background via Huey)
>
> **NEW:** Snap-to-Blog converter: Select multiple Snaps and AI
> generates a blog post draft combining them into a narrative

-   AI request logging with full audit trail

-   Rate limiting and cost controls on all AI endpoints

-   Prompt management system (versioned, stored in DB)

-   Mini app AI explainer: child-friendly explanations of simulation
    states

**Mini Apps**

-   Mini app framework: embed interactive apps in Django templates

-   Mini app registry in admin (name, category, description, embed
    config)

-   2-3 launch mini apps

> **NEW:** \'Snap from Lab\' button: After using a mini app, Sherwin can
> capture the screen and create a Snap in one tap

-   Lab page fully functional with category filtering and card-based
    layout

**AI Features: Updated for Snaps**

**Smart Tag Suggestions**

When Sherwin creates a Snap, the AI can pre-select tags for him. The
flow:

1.  Sherwin uploads an image and writes a caption

2.  Before he hits \'Share\', an HTMX call sends the image description +
    caption to /ai/suggest-tags/

3.  The AI service uses a vision model (or falls back to text-only
    analysis of the caption) to suggest relevant tags

4.  Suggested tags appear pre-selected in the tag chip row. Sherwin can
    accept, deselect, or add more.

5.  If the AI service is slow or down, tags remain unselected (graceful
    fallback, no blocking)

This is optional and non-blocking. The tag chips are interactive
regardless of whether AI suggestions arrive. The AI just makes the
default selection smarter.

**Auto Alt Text Generation**

Every Snap image should have alt text for accessibility. Since Sherwin
won\'t write it himself, the AI generates it automatically:

1.  On Snap creation, a Huey background task is queued to generate alt
    text

2.  The task sends the image to a vision model (Claude or GPT-4V) with a
    prompt: \'Describe this image in one sentence for a screen reader.
    This is a photo from a child\'s science/creativity journal.\'

3.  The generated alt text is saved to the PostMedia.alt\_text field

4.  If generation fails, the alt text defaults to the caption text
    (better than nothing)

**Snap-to-Blog Converter**

> **CHANGED:** Replaces the original \'draft from notes\' feature.
> Instead of writing blog drafts from scratch, the AI combines multiple
> Snaps into a cohesive blog post.

This is a parent-facing admin tool. The flow:

1.  In the admin, select 2-10 Snaps (e.g., all the Snaps from a week or
    a project)

2.  Click \'Create Blog Post from Snaps\'

3.  The AI receives all captions, tags, and image descriptions and
    generates a structured blog draft: a title, introduction, body with
    sections for each Snap, and a conclusion

4.  The draft appears in the blog editor for review and editing

5.  You publish when ready (this is how the blog feature gets content
    even while hidden)

**AI Service Updates**

  --------------------- ----------------------- ------------------------------------------------------------------------------
  **Service**           **Input**               **Output**
  TagSuggester          Image + caption text    CHANGED: Now analyzes images, not just text. Returns pre-selected tag chips.
  AltTextGenerator      Image file              Descriptive alt text (under 125 chars)
  SnapToBlogConverter   List of Snap IDs        NEW: Structured blog draft combining multiple Snaps into a narrative
  MiniAppExplainer      App name + state JSON   Child-friendly science explanation
  SummaryGenerator      Post body text          2-3 sentence summary. Used less with Snaps (captions are already short).
  --------------------- ----------------------- ------------------------------------------------------------------------------

**Mini Apps: Snap from Lab**

> **NEW:** After building an atom, mixing colors, or exploring the solar
> system, Sherwin can tap a \'Snap This\' button inside the mini app.
> This captures the current state as an image (via html2canvas or a
> canvas export), pre-fills a Snap creation form with the image and a
> caption like \'I built Oxygen in Atom Builder!\', and lets Sherwin
> share it in one tap.

This closes the loop between exploration (Lab) and sharing (Snaps). The
mini app state JSON is attached to the Snap\'s metadata, enabling the AI
explainer to provide context later.

**Decisions Needed Before Starting Phase 3**

**Question 1: LLM Provider**

**Which LLM for AI features?** Claude (strong at structured content +
safety), GPT-4o (good vision model for tag suggestions), or both via
LiteLLM? You need vision capability for image-based tag suggestions.

**Question 2: AI Cost Budget**

**Monthly budget for AI API calls?** With Snaps, AI runs on every post
(tag suggestions + alt text). Estimate 30-60 Snaps/month =
\~\$5-10/month with Claude Haiku or GPT-4o-mini. Snap-to-Blog is
occasional and costs more per call.

**Question 3: Mini App Framework**

**Preact, Vanilla JS + Canvas, Svelte, or a mix?** Recommendation:
Vanilla JS + Canvas for physics/science apps, Preact for UI-heavy apps.

**Question 4: Which Mini Apps First?**

**Which 2-3 apps interest Sherwin most?** Atom Builder, Color Mixer,
Solar System, Drawing Canvas, Math Puzzles? Pick what excites him.

**Question 5: AI on Snap Creation - Blocking or Background?**

**Should tag suggestions appear before or after Sherwin posts?** (a)
Before: AI suggests tags while he types the caption (adds 1-2 sec
delay), (b) After: Snap publishes immediately, AI updates tags in the
background (no delay but tags may change after posting).

**Question 6: Vision Model for Tag Suggestions**

**Should the AI actually \'see\' the image for tag suggestions?** Vision
models cost more per call. Alternative: analyze just the caption text
for tags (cheaper, but less accurate for images without descriptive
captions). The alt text generator needs vision regardless.
