**SHERWIN UNIVERSE**

Phase 5A: Core Analytics & SEO Measurement (GA4 + Search Console + Clarity)

April 2026

**Phase 5A Goal**

**Give the site reliable traffic reporting, search visibility data, and
user behavior insight.** This phase installs Google Analytics 4 for
traffic and conversions, Google Search Console for search indexing and
query data, and Microsoft Clarity for heatmaps and session replays.
These three tools together provide a complete measurement stack with
zero cost and low implementation complexity.

> **Why these three first:** GA4 gives you traffic and conversions.
> Search Console gives you Google indexing, impressions, and query data.
> Clarity gives you heatmaps and session replays. Together they cover
> the core analytics needs without adding SEO tooling complexity.

**What We Achieve**

-   GA4 installed sitewide via the Google tag (gtag.js)
-   Key conversion events tracked: form submissions, contact actions, newsletter signup
-   Microsoft Clarity recording sessions and generating heatmaps
-   Google Search Console property verified and sitemap submitted
-   Consent handling for analytics if required by target geography
-   All property IDs stored in environment variables, not hard-coded

**Business Value**

-   GA4: Page views, traffic sources, user flow, conversion tracking
-   Search Console: Query data, impressions, click-through rates, indexing status, crawl errors
-   Clarity: Session replays, heatmaps, rage clicks, dead clicks, scroll depth

---

**Task 1: GA4 Installation via Google Tag**

**Implementation Location:** `templates/base.html` inside `{% block extra_head %}`

**Steps:**

1.  Create a GA4 property at analytics.google.com.
2.  Copy the Measurement ID (format: `G-XXXXXXXXXX`).
3.  Add `GA4_MEASUREMENT_ID` to `sherwin-universe.env` and to Django settings via `env()`.
4.  Add the Google tag snippet to the base template, reading the ID from settings context.
5.  Wrap the script in a consent check if consent handling is active (see Task 5).

**Template Pattern:**

```html
{% if ga4_measurement_id %}
<script async src="https://www.googletagmanager.com/gtag/js?id={{ ga4_measurement_id }}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '{{ ga4_measurement_id }}');
</script>
{% endif %}
```

**Django Settings:**

```python
GA4_MEASUREMENT_ID = env("GA4_MEASUREMENT_ID", default="")
```

**Context Processor or Template Tag:**

Create a context processor in `apps/core/` that injects `ga4_measurement_id`
and `clarity_project_id` into all templates so the base template can
reference them without per-view logic.

```python
# apps/core/context_processors.py
from django.conf import settings

def analytics(request):
    return {
        "ga4_measurement_id": getattr(settings, "GA4_MEASUREMENT_ID", ""),
        "clarity_project_id": getattr(settings, "CLARITY_PROJECT_ID", ""),
    }
```

Register in `settings/base.py` under `TEMPLATES` → `OPTIONS` → `context_processors`.

---

**Task 2: GA4 Event Tracking**

**Goal:** Track meaningful user actions beyond page views.

**Events to Track:**

| Event Name              | Trigger                                | Method         |
|-------------------------|----------------------------------------|----------------|
| `snap_created`          | Snap form submitted successfully       | gtag() call    |
| `contact_form_submit`   | Contact form submitted                 | gtag() call    |
| `newsletter_signup`     | Newsletter form submitted              | gtag() call    |
| `miniapp_launched`      | User opens a mini app                  | gtag() call    |
| `gallery_image_viewed`  | Lightbox image opened                  | gtag() call    |

**Implementation:**

Add `gtag('event', ...)` calls in the relevant JavaScript or HTMX
response handlers. Example:

```javascript
gtag('event', 'snap_created', {
  event_category: 'engagement',
  event_label: 'snap_form'
});
```

For HTMX-driven forms, fire events on `htmx:afterSwap` or from a
success response template fragment.

**GA4 Configuration:**

Mark `snap_created`, `contact_form_submit`, and `newsletter_signup` as
conversion events in the GA4 admin under Events → Mark as conversion.

---

**Task 3: Microsoft Clarity Installation**

**Implementation Location:** `templates/base.html` inside `{% block extra_head %}`

**Steps:**

1.  Create a Clarity project at clarity.microsoft.com.
2.  Copy the Project ID.
3.  Add `CLARITY_PROJECT_ID` to `sherwin-universe.env` and Django settings.
4.  Add the Clarity tracking script to the base template.
5.  Wrap in consent check if consent handling is active (see Task 5).

**Template Pattern:**

```html
{% if clarity_project_id %}
<script type="text/javascript">
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "{{ clarity_project_id }}");
</script>
{% endif %}
```

**Django Settings:**

```python
CLARITY_PROJECT_ID = env("CLARITY_PROJECT_ID", default="")
```

---

**Task 4: Google Search Console Verification & Sitemap Submission**

**Prerequisites:** The site already has a working sitemap at `/sitemap.xml`
(via `django.contrib.sitemaps`) and `robots.txt` (via `apps/core/views.robots_txt`)
that references the sitemap.

**Steps:**

1.  Go to search.google.com/search-console and add the site property.
2.  Verify ownership using one of these methods (in order of preference):
    -   **DNS TXT record** (recommended, most durable)
    -   **HTML meta tag** (add to base template `{% block meta %}`)
    -   **HTML file upload** (add a static verification file)
3.  After verification, go to Sitemaps and submit: `https://sherwinuniverse.com/sitemap.xml`
4.  Review the Index → Pages report for any crawling or indexing issues.

**If Using Meta Tag Verification:**

Add to `sherwin-universe.env`:

```
GOOGLE_SITE_VERIFICATION=your-verification-string
```

Add to base template inside `{% block meta %}`:

```html
{% if google_site_verification %}
<meta name="google-site-verification" content="{{ google_site_verification }}" />
{% endif %}
```

Add to the analytics context processor:

```python
"google_site_verification": getattr(settings, "GOOGLE_SITE_VERIFICATION", ""),
```

**Validation:**

-   Confirm `/sitemap.xml` returns valid XML with all expected URLs
-   Confirm `/robots.txt` returns `Sitemap: https://sherwinuniverse.com/sitemap.xml`
-   Search Console shows "Sitemap submitted successfully"

---

**Task 5: Consent Handling**

**Requirement:** If the site serves users in the EU/EEA or other
jurisdictions requiring cookie consent, analytics scripts must not fire
until consent is granted.

**Recommended Approach:**

Use a lightweight cookie banner (e.g., a simple Alpine.js component or
a small library like `cookieconsent`) that:

1.  Shows a consent banner on first visit.
2.  Sets a cookie (e.g., `analytics_consent=true`) when accepted.
3.  GA4 and Clarity scripts check for this cookie before loading.

**Template Pattern with Consent Guard:**

```html
<script>
  function hasAnalyticsConsent() {
    return document.cookie.split(';').some(c => c.trim().startsWith('analytics_consent=true'));
  }
</script>

{% if ga4_measurement_id %}
<script>
  if (hasAnalyticsConsent()) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id={{ ga4_measurement_id }}';
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '{{ ga4_measurement_id }}');
  }
</script>
{% endif %}
```

**Decision:** If the site only targets US users and the privacy policy
does not require consent, this task can be deferred. Document the
decision either way.

---

**Task 6: Validation & Smoke Testing**

**GA4 Validation:**

-   Install the [Google Tag Assistant](https://tagassistant.google.com/)
    Chrome extension.
-   Browse the site and confirm page_view events fire on every page.
-   Submit a test Snap and confirm the `snap_created` event appears.
-   Check GA4 Realtime report for incoming hits.

**Clarity Validation:**

-   Log in to clarity.microsoft.com.
-   Browse the site for 2-3 minutes.
-   Confirm a session recording appears in the Clarity dashboard.
-   Confirm heatmap data begins populating.

**Search Console Validation:**

-   Verify property shows "Verified" status.
-   Sitemap shows "Success" with the expected number of URLs.
-   Use the URL Inspection tool to check a few key pages.

**Technical Validation:**

-   `/robots.txt` returns 200 with correct content.
-   `/sitemap.xml` returns 200 with valid XML.
-   No JavaScript console errors from analytics scripts.
-   Scripts do not load if consent is required and not given.

---

**Task 7: Documentation**

Record the following in project notes or a `.env.example` update:

| Item                        | Value / Location                                    |
|-----------------------------|-----------------------------------------------------|
| GA4 Measurement ID          | `GA4_MEASUREMENT_ID` in env                         |
| GA4 Property URL            | analytics.google.com → property link                |
| Clarity Project ID          | `CLARITY_PROJECT_ID` in env                         |
| Clarity Dashboard URL       | clarity.microsoft.com → project link                |
| Search Console Property     | search.google.com/search-console → property link    |
| Verification Method         | DNS TXT / Meta tag / HTML file (document which)     |
| Sitemap URL                 | `/sitemap.xml`                                      |
| robots.txt URL              | `/robots.txt`                                       |
| Consent Handling            | Active / Deferred (document decision + rationale)   |
| Context Processor Location  | `apps/core/context_processors.py`                   |
| Template Location           | `templates/base.html` → `{% block extra_head %}`    |

---

**CSP Notes (If Applicable)**

If Content Security Policy headers are added in a future phase, the
following domains must be allowed:

| Domain                              | Purpose            |
|-------------------------------------|--------------------|
| `https://www.googletagmanager.com`  | GA4 gtag.js        |
| `https://www.google-analytics.com`  | GA4 data collection|
| `https://www.clarity.ms`            | Clarity script     |

---

**Acceptance Criteria**

- [ ] GA4 is installed sitewide and page views appear in GA4 Realtime report
- [ ] At least `snap_created` and one other conversion event visible in GA4
- [ ] Clarity is installed and recording sessions / generating heatmaps
- [ ] Google Search Console property is verified
- [ ] Sitemap submitted in Search Console and shows "Success"
- [ ] `/robots.txt` and `/sitemap.xml` return valid 200 responses
- [ ] All property IDs are in environment variables, not hard-coded
- [ ] Consent mechanism is active if required (or decision to defer is documented)
- [ ] Context processor registered and injecting analytics IDs into templates

**Out of Scope**

-   Full SEO content strategy
-   Keyword research backlog
-   Custom analytics dashboarding
-   Google Tag Manager (using direct gtag.js instead)
