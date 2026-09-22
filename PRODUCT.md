# PRODUCT.md — Sherwin Universe

Durable product context for design work (read by the impeccable skill). Written 2026-09-21 from the brief and the existing site; items marked *assumed* were not confirmed by the owner.

## What it is

Sherwin Universe (https://www.sherwinuniverse.com) is the personal website of Sherwin, a 12-year-old who builds rockets, planes, tanks and vehicles in Kerbal Space Program, Stormworks, Simple Planes and BeamNG, and who codes playable physics sims. The site is styled as his own space program: "Mission Control".

Sections: Home (launch hero, Launch Bay of playable sims, Mission Log feed of "snaps"), Timeline (milestones), Highlights (media gallery), Lab (the playable sims), About (commander profile). Content is edited through the Django admin by Sherwin and his dad.

## Who it is for

- **Primary:** Sherwin's friends, ages 11-13, arriving from a shared link on a phone or a school laptop. Success = "that's really cool" within seconds and clicking Play on a sim. *(assumed from the brief: "very cool among other kids")*
- **Secondary:** family and relatives following his missions; the occasional teacher.
- **The owner's goal:** the site should feel exciting enough that Sherwin wants to share it.

## The job of the surfaces

- **Home (Persuade):** land mid-launch, understand what Sherwin builds, and get to a sim in one click. Real proof lives in the content: KSP screenshots with his own mission reports, and the sims themselves.
- **Lab (Persuade → Operate):** a game-launcher shelf of sims; each tile shows the sim alive before you click.
- **Timeline (Read):** the story in order, as a flight path.
- **Highlights (Experience):** the best shots, imagery first.
- **About (Read):** who he is, what he plays, what he loves.

## Brand commitments (pinned by the owner)

- The **Mission Control** world stays: near-black cosmos, nova orange / plasma cyan / nebula violet, Space Grotesk display, JetBrains Mono for readouts, HUD hairline labels ("Sector 05 · The Lab"), gradient hero headline, animated starfield.
- **Dark is the default theme.** A designed "daylight cosmos" light theme exists (tinted peach→lavender→blue, pastel nebulae); the hero goes light in light mode, never dark-on-light.
- Space Grotesk / Inter / JetBrains Mono are accepted despite being common; the owner has not asked for a font change.
- Emoji may appear in owner-authored content (About loadout chips, snap bodies) but not as UI icons.

## Constraints

- Django templates + Tailwind CDN + vanilla CSS (`static/css/main.css`) + vanilla JS (`static/js/main.js`); HTMX and Alpine already present. No build step, no new dependencies.
- Everything must work in both themes; bump the `?v=` cache-bust query on main.css/main.js in `templates/base.html` when changing them.
- Respect `prefers-reduced-motion`; nonessential loops stop when off-screen or hidden.
- Sims are DB rows (`MiniApp`: slug, name, description, category, tags, thumbnail); templates must not hard-code them. Live previews are keyed by slug keywords in `main.js` (`pickScene`) with a generic fallback scene.
- No image generation available in the dev environment; imagery is authored SVG/CSS/canvas or the owner's own photos.

## Copy voice

First person, plain, a little proud, specific ("Mach 5.8", "free capture at Tylo"). Space-program vocabulary is the metaphor (missions, launch bay, mission day, T-minus), never fake enterprise jargon. No em-dashes in template copy.
