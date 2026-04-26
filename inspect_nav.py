
import asyncio
from playwright.async_api import async_playwright

async def inspect_route(page, route):
    print(f"\nInspecting route: {route}")
    try:
        await page.goto(f"http://127.0.0.1:8000{route}", wait_until="networkidle")
    except Exception as e:
        print(f"Error loading {route}: {e}")
        return

    # Find all navs
    navs = page.locator("nav")
    count = await navs.count()
    print(f"Found {count} nav elements")
    
    for i in range(count):
        nav = navs.nth(i)
        nav_box = await nav.bounding_box()
        print(f"\nNav {i} Bounding Box: {nav_box}")
        
        links = nav.locator("a")
        link_count = await links.count()
        for j in range(link_count):
            link = links.nth(j)
            text = await link.inner_text()
            visible = await link.is_visible()
            box = await link.bounding_box()
            label = text.strip() if text.strip() else "[No Text]"
            print(f"  Link {j}: {label}")
            print(f"    Visible: {visible}")
            print(f"    Box: {box}")

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={"width": 360, "height": 800})
        page = await context.new_page()
        
        await inspect_route(page, "/highlights/")
        await inspect_route(page, "/timeline/")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
