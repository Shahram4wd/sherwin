**SHERWIN UNIVERSE**

Phase 5B: SEO Auditing & Backlink Visibility (Ahrefs Webmaster Tools)

April 2026

**Phase 5B Goal**

**Add SEO auditing and backlink visibility to the measurement stack.**
This phase verifies the site in Ahrefs Webmaster Tools and enables
automated site crawling. Ahrefs WMT provides site audit reports,
organic keyword tracking, and backlink monitoring at no cost for
verified site owners.

> **Why this is Phase B:** Ahrefs Webmaster Tools is an SEO analysis
> tool, not an on-site Django integration. It requires no code changes
> to the site itself — only domain verification and configuration in the
> Ahrefs dashboard. It depends on Phase 5A being complete (working
> sitemap, robots.txt, and site verification patterns established).

**Prerequisites**

-   Phase 5A complete: sitemap, robots.txt, and Search Console verified
-   Site is publicly accessible (Ahrefs crawler needs to reach it)

**Business Value**

-   Site health audit: broken links, redirect chains, missing meta tags, slow pages
-   Organic keyword tracking: which keywords the site ranks for
-   Backlink monitoring: who links to the site and link quality
-   Complements Search Console data with third-party crawl perspective

---

**Task 1: Ahrefs Webmaster Tools Verification**

**Steps:**

1.  Go to ahrefs.com/webmaster-tools and sign up or log in.
2.  Add the site: `https://sherwinuniverse.com`
3.  Verify ownership using one of these methods:
    -   **DNS CNAME record** (recommended, most durable)
    -   **HTML file upload** (add a static verification file to the site root)
    -   **HTML meta tag** (add to base template — can reuse the `{% block meta %}` pattern from Phase 5A)
4.  Wait for verification confirmation.

**If Using Meta Tag Verification:**

Add to `sherwin-universe.env`:

```
AHREFS_SITE_VERIFICATION=your-verification-string
```

Add to Django settings:

```python
AHREFS_SITE_VERIFICATION = env("AHREFS_SITE_VERIFICATION", default="")
```

Add to the analytics context processor (`apps/core/context_processors.py`):

```python
"ahrefs_site_verification": getattr(settings, "AHREFS_SITE_VERIFICATION", ""),
```

Add to base template inside `{% block meta %}`:

```html
{% if ahrefs_site_verification %}
<meta name="ahrefs-site-verification" content="{{ ahrefs_site_verification }}" />
{% endif %}
```

---

**Task 2: Enable Site Audit Crawling**

**Steps:**

1.  After verification, go to Site Audit in the Ahrefs dashboard.
2.  Create a new project for `sherwinuniverse.com`.
3.  Configure crawl settings:
    -   Crawl scope: entire site
    -   Crawl schedule: weekly (sufficient for a personal site)
    -   Crawl limit: default (2,000+ pages for free plan is more than enough)
4.  Start the first crawl.
5.  Review the initial audit report for critical issues.

**What to Check in First Audit:**

| Category          | What to Look For                                          |
|-------------------|-----------------------------------------------------------|
| Performance       | Slow pages, large images, render-blocking resources       |
| HTML tags         | Missing or duplicate title tags, meta descriptions        |
| Links             | Broken internal/external links, redirect chains           |
| Images            | Missing alt text, oversized images                        |
| Indexability      | Noindex tags, canonical issues, orphan pages              |

---

**Task 3: Confirm robots.txt and Sitemap Accessibility**

This should already be validated in Phase 5A, but verify specifically
for Ahrefs:

-   Ahrefs crawler (`AhrefsBot`) is not blocked in `robots.txt`
-   Current `robots.txt` uses `User-Agent: *` with `Allow: /` — this
    is correct and allows all crawlers including AhrefsBot
-   Sitemap URL is present in `robots.txt` and resolves correctly

**If You Want to Explicitly Allow AhrefsBot:**

No changes needed. The current `robots.txt` (`User-Agent: *`, `Allow: /`)
permits all bots. Only add specific rules if you want to block certain
crawlers while allowing Ahrefs.

---

**Task 4: Documentation Update**

Add to the Phase 5A documentation table:

| Item                          | Value / Location                                  |
|-------------------------------|---------------------------------------------------|
| Ahrefs WMT Project URL       | ahrefs.com/webmaster-tools → project link         |
| Ahrefs Verification Method   | DNS CNAME / Meta tag / HTML file (document which) |
| Crawl Schedule                | Weekly                                            |
| AhrefsBot Status              | Allowed (via `User-Agent: *`)                     |

---

**Acceptance Criteria**

- [ ] Ahrefs Webmaster Tools project is verified for `sherwinuniverse.com`
- [ ] Site audit crawl is enabled and first crawl has completed
- [ ] `robots.txt` permits AhrefsBot (no blocking rules)
- [ ] Initial audit report reviewed and critical issues noted
- [ ] Verification method and project URL documented in project notes

**Out of Scope**

-   Backlink outreach or link building campaigns
-   Keyword research backlog or content strategy
-   Ahrefs paid plan features (Site Explorer, Content Explorer, etc.)
-   Competing tool evaluation (SEMrush, Ubersuggest, Moz)
