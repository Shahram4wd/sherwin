"""
Playwright E2E tests for Sherwin Universe.

These tests run against the dev server (docker compose up → localhost:8088).
They cover the Phase 2 acceptance criteria:
  - Creating a Snap (login → form → submit → detail page)
  - Browsing the Gallery (Highlights)
  - Viewing the Timeline

Prerequisites:
  1. docker compose up (running on localhost:8088)
  2. pip install pytest-playwright && playwright install chromium
  3. A PinProfile must exist (created via Django admin or fixture)

Run:
  pytest tests/e2e/ --headed    (to watch)
  pytest tests/e2e/             (headless)
"""

import re

import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:8088"


@pytest.fixture(scope="session")
def browser_context_args():
    return {"base_url": BASE_URL}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def login_with_pin(page: Page, pin: str = "1234"):
    """Log in via the kid-friendly PIN form."""
    page.goto("/accounts/login/")
    # Type each digit into the PIN input
    page.fill("input[name='pin']", pin)
    page.click("button[type='submit']")
    # Should redirect away from login
    page.wait_for_url(lambda url: "/accounts/login" not in url)


# ---------------------------------------------------------------------------
# Test: Home feed loads
# ---------------------------------------------------------------------------

class TestHomeFeed:
    def test_home_page_loads(self, page: Page):
        page.goto("/")
        expect(page).to_have_title(re.compile(r"Sherwin Universe"))

    def test_navigation_links_visible(self, page: Page):
        page.goto("/")
        expect(page.locator("text=Timeline")).to_be_visible()
        expect(page.locator("text=Highlights")).to_be_visible()
        expect(page.locator("text=Lab")).to_be_visible()
        expect(page.locator("text=About")).to_be_visible()


# ---------------------------------------------------------------------------
# Test: Create a Snap (requires login)
# ---------------------------------------------------------------------------

class TestSnapCreation:
    def test_create_snap_with_image(self, page: Page, tmp_path):
        login_with_pin(page)

        # Navigate to create form
        page.goto("/snap/new/")
        expect(page.locator("text=Share something")).to_be_visible()

        # Create a test image file
        test_image = tmp_path / "test_snap.png"
        # 1x1 red PNG
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4"
            "nGP4z8BQDwAEgAF/pooBPQAAAABJRU5ErkJggg=="
        )
        test_image.write_bytes(png_data)

        # Upload image
        page.locator("input[name='images']").set_input_files(str(test_image))

        # Fill caption
        page.fill("textarea[name='caption']", "E2E test snap - automated")

        # Submit
        page.click("button[type='submit']")

        # Should redirect to snap detail
        page.wait_for_url(re.compile(r"/snap/.+/"))
        expect(page.locator("text=E2E test snap - automated")).to_be_visible()

    def test_unauthenticated_redirects_to_login(self, page: Page):
        page.goto("/snap/new/")
        expect(page).to_have_url(re.compile(r"/accounts/login"))


# ---------------------------------------------------------------------------
# Test: Browse Gallery (Highlights)
# ---------------------------------------------------------------------------

class TestGallery:
    def test_highlights_page_loads(self, page: Page):
        page.goto("/highlights/")
        expect(page).to_have_title(re.compile(r"Highlights"))

    def test_gallery_has_filter_buttons(self, page: Page):
        page.goto("/highlights/")
        # Should have type filter buttons
        expect(page.locator("text=All")).to_be_visible()

    def test_lightbox_opens_on_image_click(self, page: Page):
        page.goto("/highlights/")
        images = page.locator("[data-lightbox-idx]")
        if images.count() > 0:
            images.first.click()
            # Lightbox overlay should appear
            expect(page.locator(".fixed.inset-0")).to_be_visible()


# ---------------------------------------------------------------------------
# Test: View Timeline
# ---------------------------------------------------------------------------

class TestTimeline:
    def test_timeline_page_loads(self, page: Page):
        page.goto("/timeline/")
        expect(page).to_have_title(re.compile(r"Timeline"))

    def test_timeline_has_year_navigation(self, page: Page):
        page.goto("/timeline/")
        # The timeline should have year filter or display
        expect(page.locator("text=2026").first).to_be_visible()


# ---------------------------------------------------------------------------
# Test: Snap Detail
# ---------------------------------------------------------------------------

class TestSnapDetail:
    def test_snap_detail_shows_content(self, page: Page):
        """Visit the home page and click through to a snap detail."""
        page.goto("/")
        # Click the first "View" link in the feed
        view_links = page.locator("a:has-text('View')")
        if view_links.count() > 0:
            view_links.first.click()
            page.wait_for_url(re.compile(r"/snap/.+/"))
            # Should show back link and content
            expect(page.locator("text=Back to feed")).to_be_visible()


# ---------------------------------------------------------------------------
# Test: Search
# ---------------------------------------------------------------------------

class TestSearch:
    def test_search_input_exists(self, page: Page):
        page.goto("/")
        search = page.locator("input[name='q']")
        expect(search.first).to_be_visible()
