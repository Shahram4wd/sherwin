---
name: Sherwin Universe
description: Sherwin's space program, presented like a game launcher. Near-black cosmos lit by nova orange, plasma cyan and nebula violet; dark by default, daylight-cosmos light theme.
colors:
  # Dark theme surfaces (Tailwind `space` scale + panel base)
  cosmos: "#050508"
  space-900: "#0a0a12"
  space-800: "#111120"
  space-700: "#1a1a2e"
  space-600: "#22223a"
  panel-deep: "#0a0a16"
  glass-fill: "rgba(255, 255, 255, 0.03)"
  glass-border: "rgba(255, 255, 255, 0.08)"
  # Ignition (Tailwind `accent`): the base of every fire gradient and the solid utility CTA
  ignition-600: "#dc2626"
  ignition: "#ef2d2d"
  ignition-400: "#ff4d4d"
  ignition-300: "#ff8080"
  # Nova orange (Tailwind `nova`): the world's primary light
  nova: "#ff8a3d"
  nova-400: "#ffb45c"
  nova-300: "#ffd08a"
  # Plasma cyan (Tailwind `plasma`): cool counterpoint, focus ring, ghost hover
  plasma: "#22d3ee"
  plasma-400: "#38bdf8"
  plasma-300: "#7dd3fc"
  # Nebula violet (Tailwind `nebula`): depth and distant bodies
  nebula: "#8b5cf6"
  nebula-400: "#a78bfa"
  nebula-300: "#c4b5fd"
  # Status
  status-go: "#34d399"
  # Dark theme text
  text-primary: "#ffffff"
  text-lede: "#cbd5e1"
  text-body: "#e5e7eb"
  text-soft: "#d1d5db"
  text-muted: "#9ca3af"
  text-dim: "#6b7280"
  # Light theme ("daylight cosmos")
  light-sky-peach: "#fdf3ec"
  light-sky-lavender: "#f2f3fb"
  light-sky-mist: "#e9edf8"
  light-sky-blue: "#e3f0f6"
  light-surface: "#ffffff"
  light-surface-tint: "#f3f4f6"
  light-border: "#e5e7eb"
  light-border-strong: "#d1d5db"
  light-nav: "rgba(30, 30, 40, 0.95)"
  light-heading: "#111827"
  light-text: "#1f2937"
  light-text-soft: "#374151"
  light-text-muted: "#4b5563"
  light-text-dim: "#6b7280"
  light-nova: "#c2410c"
  light-ember: "#ea580c"
  light-ignition: "#dc2626"
  light-amber: "#d97706"
  light-plasma: "#0284c7"
  light-plasma-deep: "#0369a1"
  light-nebula: "#7c3aed"
  light-status-go: "#059669"
typography:
  display:
    fontFamily: "\"Space Grotesk\", system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 5rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "\"Space Grotesk\", system-ui, sans-serif"
    fontSize: "3rem (4.5rem from 768px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
  section:
    fontFamily: "\"Space Grotesk\", system-ui, sans-serif"
    fontSize: "1.5rem (1.875rem from 768px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "\"Space Grotesk\", system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.015em"
  button:
    fontFamily: "\"Space Grotesk\", system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  lede:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1rem, 1.2vw, 1.15rem)"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.625
  readout:
    fontFamily: "\"JetBrains Mono\", ui-monospace, monospace"
    fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)"
    fontWeight: 700
    lineHeight: 1.2
    fontVariation: "tabular-nums"
  label:
    fontFamily: "\"JetBrains Mono\", ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.32em"
  tag:
    fontFamily: "\"JetBrains Mono\", ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  btn: "0.9rem"
  lg: "1rem"
  xl: "1.25rem"
  2xl: "1.5rem"
  pill: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  card: "1.25rem"
  gutter: "1.5rem"
  panel: "2rem"
  header: "3rem"
  section: "4rem"
  section-md: "6rem"
  sticky-top: "6rem"
components:
  button-launch:
    backgroundColor: "{colors.ignition}"
    textColor: "{colors.text-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.btn}"
    padding: "0.9rem 2rem"
  button-ghost:
    backgroundColor: "rgba(255, 255, 255, 0.04)"
    textColor: "{colors.text-body}"
    typography: "{typography.button}"
    rounded: "{rounded.btn}"
    padding: "0.9rem 2rem"
  button-ghost-hover:
    backgroundColor: "rgba(125, 211, 252, 0.08)"
  button-utility:
    backgroundColor: "{colors.ignition}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
  button-utility-hover:
    backgroundColor: "{colors.ignition-600}"
  hud-label:
    textColor: "{colors.nova}"
    typography: "{typography.label}"
  glass-card:
    backgroundColor: "{colors.glass-fill}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "1.25rem"
  glass-card-hover:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
  cosmic-panel:
    backgroundColor: "{colors.panel-deep}"
    rounded: "{rounded.2xl}"
    padding: "2rem"
  hud-strip:
    backgroundColor: "rgba(10, 10, 22, 0.55)"
    rounded: "{rounded.lg}"
    padding: "1.1rem 0.75rem 1rem"
  sim-tile:
    backgroundColor: "{colors.panel-deep}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "1.2rem 1.3rem 1.3rem"
  sim-play:
    backgroundColor: "{colors.ignition}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1.15rem"
    height: "40px"
  sim-badge:
    backgroundColor: "rgba(5, 5, 8, 0.55)"
    textColor: "{colors.plasma-300}"
    typography: "{typography.tag}"
    rounded: "{rounded.pill}"
    padding: "0.32rem 0.7rem"
  snap-tag:
    backgroundColor: "rgba(255, 138, 61, 0.09)"
    textColor: "{colors.nova-400}"
    typography: "{typography.tag}"
    rounded: "{rounded.pill}"
    padding: "0.28rem 0.65rem"
  snap-tag-hover:
    backgroundColor: "rgba(255, 138, 61, 0.2)"
    textColor: "{colors.nova-300}"
  flight-type:
    backgroundColor: "rgba(125, 211, 252, 0.08)"
    textColor: "{colors.plasma-300}"
    typography: "{typography.tag}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.6rem"
  loadout-chip:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
    textColor: "{colors.text-soft}"
    rounded: "{rounded.pill}"
    padding: "0.45rem 0.9rem"
  segmented:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
    rounded: "{rounded.pill}"
    padding: "0.25rem"
  segmented-active:
    backgroundColor: "{colors.ignition}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    padding: "0.4rem 1.1rem"
  nav-link:
    textColor: "{colors.text-muted}"
  nav-link-active:
    textColor: "{colors.text-primary}"
  input-search:
    backgroundColor: "{colors.space-800}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem 0.5rem 2.25rem"
  empty-glyph:
    backgroundColor: "rgba(255, 138, 61, 0.08)"
    textColor: "{colors.nova-400}"
    rounded: "{rounded.xl}"
    size: "4.5rem"
  skip-link:
    backgroundColor: "{colors.nova}"
    textColor: "{colors.space-900}"
    rounded: "0.7rem"
    padding: "0.65rem 1.1rem"
  feed-chip:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
    textColor: "{colors.text-lede}"
    rounded: "{rounded.pill}"
    padding: "0.45rem 0.95rem"
  feed-chip-hover:
    backgroundColor: "rgba(255, 255, 255, 0.1)"
    textColor: "{colors.text-primary}"
  feed-chip-active:
    backgroundColor: "{colors.ignition}"
    textColor: "{colors.text-primary}"
  commander-card:
    backgroundColor: "{colors.glass-fill}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "0"
  cc-stat:
    textColor: "{colors.nova-400}"
    padding: "0.7rem 0.25rem"
  cc-link:
    textColor: "{colors.text-lede}"
    padding: "0.75rem"
  cc-link-hover:
    backgroundColor: "rgba(255, 255, 255, 0.04)"
    textColor: "{colors.nova-400}"
  sim-tile-mini:
    backgroundColor: "{colors.panel-deep}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "0.75rem 0.9rem 0.85rem"
    height: "128px"
  sim-play-mini:
    backgroundColor: "{colors.ignition}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    padding: "0.3rem 0.8rem"
    height: "32px"
  lb-control:
    backgroundColor: "rgba(255, 255, 255, 0.1)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    size: "2.75rem"
  lb-control-hover:
    backgroundColor: "rgba(255, 255, 255, 0.2)"
  lb-thumb:
    rounded: "{rounded.sm}"
    width: "64px"
    height: "44px"
---

# Design System: Sherwin Universe

Recorded 2026-09-21 from the shipped code (`templates/base.html`, `static/css/main.css`, `static/js/main.js`, page templates; cache-bust `?v=20260921-launch3`) and refreshed the same day after the feed-first home layout landed. Frontmatter tokens are normative; the prose says where and why. Machine-readable extensions (shadows, motion, breakpoints, component snippets) live in `.impeccable/design.json`.

## Overview

**Creative North Star: "Mission Control, played like a game launcher"**

Sherwin Universe is a 12-year-old's space program rendered as his own Mission Control. The screen is a near-black cosmos with a live starfield and three slow nebulae; everything that sits on it is either glass (a faint white film with a hairline border) or a lit instrument (nova-orange readouts, plasma-cyan focus, violet depth). The visitor lands mid-launch: a T-minus readout counts down, a rocket lifts off a planet horizon and keeps climbing as they scroll, and the sims in the Launch Bay are already moving before anyone clicks. The build refuses the boxed hero card, the equal-card row and the generic social feed: the hero is full-bleed and short enough that the feed shows under it, the home is feed-first (a three-column bridge: commander card on the left, the Mission Log in the centre under a row of tag chips, a sticky Launch Bay rail of live mini tiles on the right), and the Mission Log's cards behave like field reports (HUD corner brackets, `T-` timestamps, mono tag chips). The Lab is the full game shelf; on Home the sims are a rail, not a section.

Density is editorial rather than dashboard-dense: one big display line per screen, a feed that starts 2rem to 3rem under the hero and then breathes in 1.25rem card gaps, sector pages with 3rem to 6rem of section rhythm, and small mono labels doing the wayfinding. Dark is the default. The light theme is not an inversion but a "daylight cosmos": a tinted peach-to-lavender-to-blue sky with the same pastel nebulae turned up, white cards, and every glow either removed or re-tuned to a deeper ember. The nav stays dark in both themes.

**Key Characteristics:**
- Cosmos background (`#050508`) that is drawn, not flat: canvas starfield with three parallax layers, twinkle and shooting stars, plus three blurred nebula discs drifting on 46s to 58s loops.
- Fire gradient as the signature: ignition red into nova orange (into cream for text), used for the primary CTA, the active segment and feed chip, the nav underline, the scroll-progress bar and gradient headlines.
- Feed-first home: the hero hands off to a three-column bridge (240px commander card | `max-w-xl` posts | 300px Launch Bay rail), both rails sticky at 6rem; on phones the rail becomes a snap-scrolling swipe strip above the feed.
- HUD grammar: JetBrains Mono, uppercase, wide tracking (0.12em to 0.32em), a 24px gradient hairline before every sector label.
- Glass at rest, glow on interaction: surfaces are near-transparent with hairline borders; hover adds a warm ring or shadow and a 2px to 4px lift.
- One easing curve for entrances, `cubic-bezier(0.16, 1, 0.3, 1)`, and a bouncy `cubic-bezier(0.34, 1.56, 0.64, 1)` reserved for toy interactions (poking the planet, the icon hop).
- An authored rocket glyph (`#i-rocket`) appears in three places: the scroll-progress bar, the launch hero, and the timeline's flight marker.
- Motion is respectful by construction: every loop stops off-screen or when the tab is hidden, the countdown plays once per session, and `prefers-reduced-motion` keeps the states and drops the movement.

## Colors

A near-black cosmos lit by a warm fire ramp (red into orange into cream) with cool plasma and violet as counterpoints; the light theme swaps the void for a tinted daylight sky and deepens every accent for contrast.

### Primary (fire ramp)

| Token | Hex | Role |
|---|---|---|
| `ignition` | `#ef2d2d` | The base of every fire gradient (`btn-launch`, `sim-play`, `seg-active`, `feed-chip.is-active`, nav underline, scroll bar). Also the solid fill of the utility button (Tailwind `bg-accent-500`), the mobile "create" disc, active tag pills and toasts. Rarely appears alone as text; when it does it is a hover or a destructive action (`text-accent-400`, `text-red-400`). |
| `ignition-600` | `#dc2626` | Utility button hover (`hover:bg-accent-600`). |
| `ignition-400` | `#ff4d4d` | Start of `gradient-text-fire`, mobile bottom-nav hover, scrollbar hover. |
| `ignition-300` | `#ff8080` | Light tint for accent text on chips (`text-accent-300`). |
| `nova` | `#ff8a3d` | The world's light. HUD label text and hairline end, `accent-color`, caret, selection, skip-link fill, stat glow, spotlight tint, flight-node "passed" fill, every warm `box-shadow`. |
| `nova-400` | `#ffb45c` | Warm readout text: `sim-tags`, `snap-tag`, `profile-stat .v`, `cc-stat .v`, `empty-glyph`, snap-media brackets; `cc-link` hover; the lit `lb-thumb.is-active` border. |
| `nova-300` | `#ffd08a` | End of the fire text gradient; hover state of warm chips; `tile-type` text; flame core; `hud-strip` label at 72% alpha. |

### Secondary (plasma cyan)

| Token | Hex | Role |
|---|---|---|
| `plasma` | `#22d3ee` | End of the scroll-progress gradient; nebula-c tint; hydraulics fluid in sim previews. |
| `plasma-400` | `#38bdf8` | The global `:focus-visible` outline (2px, 3px offset). |
| `plasma-300` | `#7dd3fc` | Rocket window (`--rocket-window`), `sim-badge` and `flight-type` text, dashed orbit and flight-line strokes, `btn-ghost` hover border, the scanline sweep, end of `gradient-text-cosmic`. |

### Tertiary (nebula violet)

| Token | Hex | Role |
|---|---|---|
| `nebula` | `#8b5cf6` | Nebula-b tint, horizon glow ring, per-sim tile tints. |
| `nebula-400` | `#a78bfa` | Electron shells and bunkers in sim previews. |
| `nebula-300` | `#c4b5fd` | Rocket nozzle (`--rocket-nozzle`), far-planet highlight, third stop of `gradient-text-cosmic`. |

### Status

| Token | Hex | Role |
|---|---|---|
| `status-go` | `#34d399` | "GO" / "ACTIVE" / "All systems go" readouts and the pulsing footer dot (Tailwind `emerald-400`). Light theme: `light-status-go`. |

### Neutral (dark theme)

| Token | Hex | Role |
|---|---|---|
| `cosmos` | `#050508` | `body` background, scrollbar-thumb border, `sim-shade` gradient base, `sim-badge` backdrop. |
| `space-900` | `#0a0a12` | Skip-link text, avatar ring (`ring-space-900`). |
| `space-800` | `#111120` | Search input fill, dropdown menus, video placeholder tile. |
| `space-700` / `space-600` | `#1a1a2e` / `#22223a` | Defined in the Tailwind palette; reserved, not used by shipping templates. |
| `panel-deep` | `#0a0a16` | `cosmic-panel` gradient top, `sim-tile` base, flight-node and flight-year dot fill, `hud-strip` film (at 55% and 25%). |
| `glass-fill` / `glass-border` | `rgba(255,255,255,0.03)` / `rgba(255,255,255,0.08)` | The glass surface pair (`glass-card`, `commander-card`, `gallery-tile`, legacy `sim-card`). Hover: 0.06 / 0.15. `cc-stats`, `cc-link` and `feed-chip` reuse the 0.08 hairline. |
| `text-primary` | `#ffffff` | Headlines, card titles, active nav. |
| `text-lede` | `#cbd5e1` | `hero-lede`, `sim-desc`, `feed-chip` and `cc-link` at rest, `lb-caption`. |
| `text-body` | `#e5e7eb` | Snap body copy (`text-gray-200`), `btn-ghost` text. |
| `text-soft` | `#d1d5db` | `.lede`, `loadout-chip`, secondary body (`text-gray-300`). |
| `text-muted` | `#9ca3af` | Nav links at rest, page intros, `flight-date`, `segmented` at rest, `cc-stat .k`, the lightbox counter (`text-gray-400`). |
| `text-dim` | `#6b7280` | Stat labels, `profile-stat .k`, timestamps, footer, mobile bottom nav at rest (`text-gray-500`). |

### Light theme ("daylight cosmos")

| Token | Hex | Role |
|---|---|---|
| `light-sky-peach` → `light-sky-lavender` → `light-sky-mist` → `light-sky-blue` | `#fdf3ec` → `#f2f3fb` → `#e9edf8` → `#e3f0f6` | `body` background, `linear-gradient(165deg, ... 0% / 35% / 70% / 100%)`. Never flat white. |
| `light-surface` | `#ffffff` | Cards, tiles, chips, segmented control, `cosmic-panel` gradient top. |
| `light-surface-tint` | `#f3f4f6` | Replaces `bg-white/5` fills. `#e5e7eb` replaces `bg-white/10`. |
| `light-border` / `light-border-strong` | `#e5e7eb` / `#d1d5db` | Card borders at rest / hover; replaces `border-white/5..20`. |
| `light-nav` | `rgba(30,30,40,0.95)` | The nav stays dark, slightly more opaque. |
| `light-heading` / `light-text` / `light-text-soft` / `light-text-muted` / `light-text-dim` | `#111827` / `#1f2937` / `#374151` / `#4b5563` / `#6b7280` | Replaces white / gray-200 / gray-300 / gray-400 / gray-500 inside `main` and `footer`. |
| `light-nova` | `#c2410c` | HUD label text, `snap-tag`, `empty-glyph`, `profile-stat .v`, `cc-stat .v`, `cc-link` hover on light. |
| `light-ignition` → `light-ember` → `light-amber` | `#dc2626` → `#ea580c` → `#d97706` | The deepened fire ramp for `gradient-text-fire`, HUD hairline, drop cap, `sim-play`, `feed-chip.is-active` (`#dc2626` → `#ea580c`; the one chip that keeps a gradient on daylight), spotlight tint (`#ea580c`). |
| `light-plasma` / `light-plasma-deep` | `#0284c7` / `#0369a1` | Dashed orbit rings, flight line, `btn-ghost` hover, sparkle color / `flight-type` and `text-plasma-300` text. |
| `light-nebula` | `#7c3aed` | Third stop of the light `gradient-text-cosmic`. |
| `light-status-go` | `#059669` | "GO" readouts on light panels. |

### Named Rules

**The Fire Ramp Rule.** Warm accents always travel red → orange (→ cream). A gradient that starts on nova and ends on red, or a warm accent that mixes in violet, is off-world. `gradient-text-cosmic` is the one sanctioned crossover (fire into violet into cyan) and it is reserved for the hero headline.

**The Nova Light Rule.** Nova orange (`#ff8a3d`) is the light source, not a fill. It appears as text on readouts, as hairlines, and as glow (`box-shadow`, `text-shadow`, `drop-shadow`); the only solid nova fills are the skip link and the "passed" flight node dot.

**The Cool Counterpoint Rule.** Plasma and nebula never carry a call to action. Cyan means focus, structure (dashed orbits, flight line) and category badges; violet means depth (distant bodies, nebulae, tile tints).

**The Deeper-on-Daylight Rule.** Every accent has a light-theme partner one to two steps darker (`#ff8a3d` → `#c2410c`, `#7dd3fc` → `#0284c7`, `#34d399` → `#059669`). Never ship a dark-theme accent on a white card.

## Typography

**Display Font:** Space Grotesk (with system-ui, sans-serif), weights 400 to 700 loaded
**Body Font:** Inter (with system-ui, sans-serif), weights 300 to 700 loaded
**Label/Mono Font:** JetBrains Mono (with ui-monospace, monospace), weights 400, 500, 700 loaded

**Character:** Space Grotesk carries every headline and button label with tight negative tracking (-0.015em to -0.03em) so the display reads as a lockup, not a paragraph. Inter does the reading. JetBrains Mono is confined to instruments: sector labels, stat readouts, timestamps, tags and badges, always uppercase and widely tracked. The owner accepts these faces as common; no change is pending.

### Hierarchy

| Role | Face / weight | Size | Line-height | Tracking | Where |
|---|---|---|---|---|---|
| Display | Space Grotesk 700 | `clamp(2.5rem, 6vw, 5rem)`; `clamp(2.1rem, 10.5vw, 2.5rem)` under 768px | 0.98 | -0.03em, `text-wrap: balance` | `.hero-title`, two stacked lines; line two wears `gradient-text-cosmic`. |
| Headline | Space Grotesk 700 | 3rem, 4.5rem from 768px (`text-5xl md:text-7xl`) | 1 | -0.025em (`tracking-tight`) | Sector page H1 (Lab, Timeline, Highlights, About). One word wears `gradient-text-fire`. |
| Section | Space Grotesk 700 | 1.5rem, 1.875rem from 768px (`text-2xl md:text-3xl`) | 1.2 to 1.33 | -0.025em (`tracking-tight`) | Home feed H2 ("Latest from the fleet"). The rail heading ("Launch Bay") drops to `text-lg` 700 and the commander card name to `text-base` 700. |
| Title | Space Grotesk 700 | 1.25rem; 1rem on `.is-mini` | 1.12 | -0.015em, `text-wrap: balance` | `.sim-title`; also `.flight-year` at 1.6rem and `text-lg font-display font-semibold` for flight-node and lab description titles. |
| Lede | Inter 400 | `clamp(1rem, 1.2vw, 1.15rem)`, max-width 34rem | 1.6 | normal | `.hero-lede`. Page intros use `text-lg` (1.125rem) in `text-muted`/`text-dim`, max-width `max-w-xl`/`max-w-lg`. |
| Editorial lede | Inter 300 | 1.35rem | 1.75 | normal | `.lede` on About, with a Space Grotesk 700 drop cap at 3.4em wearing the fire gradient. |
| Body | Inter 400 | 15px (`text-[15px]`) snap copy; 0.875rem `sim-desc` | 1.625 / 1.5 | normal | Mission Log bodies, tile descriptions, `prose-invert prose-lg` for About. |
| Readout | JetBrains Mono 700 | `clamp(1.6rem, 3.5vw, 2.4rem)`, `tabular-nums` | default | normal | `.stat-value` in the HUD strip; `profile-stat .v` and `cc-stat .v` at 1.05rem. |
| Label (HUD) | JetBrains Mono 500 | 11px (9px to 10px via `!text-[9px]`/`!text-[10px]` on card headings) | default | 0.32em, uppercase | `.hud-label` with the 24px gradient hairline. |
| Stat label | JetBrains Mono 400 | 10px (11px inside `.hud-strip`; 9px on `cc-stat .k` and the commander kicker) | default | 0.28em, uppercase | `.stat-label`; `profile-stat .k` at 0.22em; `cc-stat .k` at 0.18em; the commander card kicker "Cmdr · Sherwin Universe" at 0.28em in `text-dim`. |
| Tag / badge | JetBrains Mono 500 | 10px (9px `tile-type` and `.is-mini .sim-badge`, 11px `flight-date`, 11px `sim-card .sim-play`) | default | 0.12em to 0.2em, uppercase | `snap-tag` 0.12em, `sim-tags` 0.14em, `flight-type` / `tile-type` 0.18em, `sim-badge` 0.2em. |
| Filter chip | Inter 600 | 0.8rem | default | normal | `.feed-chip` and `.segmented a`: the one Inter label that sits in a pill. `.cc-link` shares the size. |
| Timestamp | JetBrains Mono 400 | 11px (`text-[11px]`) | default | normal | `T−{timesince}` under the author name; footer coordinates at 10px `tracking-widest`; the lightbox counter `01 / 08` at `text-xs`, 0.25em, zero-padded. |

### Named Rules

**The Readout Rule.** JetBrains Mono appears only where a number or a system label would appear on an instrument panel: sector labels, stat values, timestamps, tags, badges, coordinates. Never for headings, body copy or button labels.

**The One Gradient Word Rule.** A gradient headline lights one word (or one line in the hero). The rest of the headline stays solid white (`light-heading` on daylight).

**The Sector Label Rule.** Every sector page opens with a `.hud-label` reading `Sector NN · Name` (03 Timeline, 04 Highlights, 05 The Lab, 06 Commander Profile), 1rem above the H1. Card-level HUD labels shrink to 9px to 10px but keep the hairline.

## Layout

- **Container.** Pages sit in `max-w-6xl` (72rem) with `px-6` (1.5rem) gutters on desktop and `px-4` (1rem) on phones. The home feed bridge widens to `max-w-[1180px]` with `px-4`; the flight path narrows to `max-w-3xl` (48rem); the hero copy block uses the same 72rem with `1.5rem` side padding and a bottom padding of `clamp(1.25rem, 3vh, 2rem)`.
- **First viewport.** `.launch-hero` is full-bleed and deliberately short so the feed shows beneath it: `min-height: min(76svh, 700px)` (`76vh` fallback), `padding-top: clamp(2rem, 5vh, 3.5rem)`, content bottom-aligned (`justify-content: flex-end`). Layers by z-index: horizon disc (1), distant bodies on mouse parallax (2), rocket track (3), copy (4). The 175vw planet disc sits at `top: 68%` and its horizon carries the HUD strip.
- **Section rhythm.** The home feed starts `pt-8 md:pt-12` (2rem / 3rem) under the hero and ends `pb-24 md:pb-12` (room for the phone bottom nav); `#mission-log` carries `scroll-mt-20` for the hero's anchor link. Sector pages use `pt-12 pb-24` (3rem / 6rem). Header blocks (label + H1 + intro) take `mb-12` (3rem; `mb-10` on Highlights) before content. Timeline year groups are `mb-16` (4rem) apart.
- **Grids.** Home feed bridge (from `lg`): a flex row, `gap-6`, of a 240px commander aside, a `flex-1 min-w-0 max-w-xl` post column (cards `space-y-5`), and a 300px Launch Bay aside; both asides `sticky top-24` (6rem). Below `lg` the asides hide and the Launch Bay becomes `.sim-rail-scroll` above the posts: a snap-x flex strip (`scroll-snap-type: x mandatory`, gap 0.75rem, bleeding `-1rem` into the gutters, scrollbar hidden) of up to six `.sim-tile.is-mini` at `flex: 0 0 76%`, max 300px, 150px tall. The desktop rail (`.sim-rail`) is a one-column grid, gap 0.7rem, of up to four 128px mini tiles under a `.rail-head` (heading and "All experiments →" on one baseline, 0.75rem below). Lab: `lg:grid-cols-[280px_minmax(0,1fr)]` with `gap-8`; the shelf is `.sim-grid grid grid-cols-1 sm:grid-cols-2 gap-5` with `grid-auto-rows: clamp(230px, 24vw, 330px)` and tiles at `height: 100%` (no aspect-ratio). About: `lg:grid-cols-[330px_minmax(0,1fr)]` with `gap-10`. Highlights: CSS `columns` masonry, 2 / 3 / 4 columns at base / 768px / 1280px, `column-gap` and item margin 0.75rem, `.masonry-full` spans all.
- **HUD strip.** 2 columns on phones, 4 from 768px; cells separated by 1px hairlines, `margin-top: clamp(1.5rem, 3.5vh, 2.5rem)` from the CTAs.
- **Flight path.** `--fp-pad: 3rem` left padding, the dashed line at `--fp-x: 0.9rem`; year dots 14px and node dots 12px sit on the line.
- **Breakpoints.** Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280). Custom CSS uses `max-width: 767px` for the phone hero (rocket 52px on a track at 78% / 66%, far planet 40px at the top-left, `.scene-moon` hidden, headline `clamp(2.1rem, 10.5vw, 2.5rem)`), the hidden `.lb-nav` arrows and the 150px rail tile; `max-width: 380px` for the bottom-nav squeeze. The `max-width: 1023px` 210px `.hero-scene` rule is legacy: the launch hero resets its scene to `inset: 0`.
- **Chrome.** Desktop: sticky `glass-nav` header with logo lockup, always-visible search (`max-w-xs`), links, theme toggle. Phone: sticky header with expanding search, plus a fixed bottom nav (5-column grid with a raised 56px ignition "create" disc in the centre) and `body { padding-bottom: 4rem }`. A 3px scroll-progress bar with the rocket glyph rides the top edge (`z-index: 60`).
- **Stagger.** Reveal delays step by 100ms per sim tile (`--reveal-delay`), cycle 0 / 70 / 140 / 70ms on gallery tiles, and hero lines enter at 0.05 / 0.15 / 0.28 / 0.42 / 0.56 / 0.7s (`--d`).

## Elevation & Depth

Depth is tonal and luminous rather than shadowed. In the dark theme a surface is a glass film (`rgba(255,255,255,0.03)`) with a 1px hairline (`rgba(255,255,255,0.08)`) and `backdrop-filter: blur(12px)`; it has no shadow at rest. Interaction adds a warm ring or glow and a small lift (2px on cards, 4px on tiles). Only the deep panels (`cosmic-panel`, `sim-tile`, `hud-strip`) carry a resting shadow, and it is black, not colored. In the light theme the glass becomes solid white with a soft neutral shadow, glows are removed or re-tuned to ember, and depth comes from `rgba(30,41,59,x)` slate shadows.

### Shadow Vocabulary

| Role | Value | When |
|---|---|---|
| CTA glow (rest) | `0 4px 24px rgba(239,45,45,0.4), inset 0 1px 0 rgba(255,255,255,0.25)` | `.btn-launch`; `sim-play` uses `0 6px 20px rgba(239,45,45,0.35)` plus the same inset. |
| CTA glow (hover) | `0 8px 36px rgba(255,95,45,0.55), inset 0 1px 0 rgba(255,255,255,0.25)` | `.btn-launch:hover`; `sim-play` hover `0 8px 28px rgba(255,95,45,0.5)`. |
| Card hover ring | `0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,138,61,0.18)` | `.snap-card:hover`. Gallery: `0 12px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,138,61,0.15)`. |
| Tile hover | `0 22px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,138,61,0.18), 0 0 40px rgba(255,138,61,0.12)` | `.sim-tile:hover`, `:focus-visible` (mini tiles too). |
| Lightbox image | `0 30px 80px rgba(0,0,0,0.6)` | `.lb-img` on the black stage. |
| Thumb lit | `0 0 0 1px rgba(255,180,92,0.4), 0 0 16px rgba(255,138,61,0.35)` | `.lb-thumb.is-active`, with a `#ffb45c` border and a 2px lift. |
| Panel rest | `0 10px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)` | `.hud-strip`. `.empty-glyph`: `0 10px 30px rgba(0,0,0,0.3)`. |
| Horizon glow | `0 -1px 0 rgba(255,205,160,0.75), 0 -14px 40px rgba(255,138,61,0.45), 0 -50px 140px rgba(139,92,246,0.32), 0 -130px 320px rgba(34,211,238,0.10)` | `.horizon-disc`: a cream rim, then nova, violet and cyan atmosphere. |
| Text glow | `0 0 24px rgba(255,138,61,0.45)` | `.stat-value`. HUD hairline `0 0 8px rgba(255,138,61,0.8)`. Active nav underline `0 0 8px rgba(255,77,77,0.7)`. |
| Glyph glow | `drop-shadow(0 0 10px rgba(255,138,61,0.55))` | Rocket bodies; scroll rocket `0 0 6px` at 0.8; flight marker `0 0 10px` at 0.75. |
| Waypoint lit | `0 0 0 4px rgba(239,45,45,0.22), 0 0 18px rgba(239,45,45,0.7)` | `.flight-year.is-passed::before`; nodes `0 0 14px rgba(255,138,61,0.85)`. |
| Segment / chip active | `0 2px 12px rgba(239,45,45,0.35)` | `.seg-active`; `.feed-chip.is-active` uses `0 4px 16px rgba(239,45,45,0.3)`. Tailwind `shadow-lg shadow-accent-500/25` on utility buttons and logo. |
| Light card rest / hover | `0 1px 3px rgba(0,0,0,0.08)` / `0 4px 12px rgba(0,0,0,0.1)` | `.glass-card`, `.gallery-tile`, `.segmented` on daylight. |
| Light panel | `0 16px 48px rgba(30,41,59,0.10)` | `.cosmic-panel`; `.hud-strip` `0 10px 30px rgba(30,41,59,0.12), inset 0 1px 0 rgba(255,255,255,0.9)`; `.sim-tile` `0 12px 34px rgba(30,41,59,0.18)` (hover `0 22px 50px rgba(30,41,59,0.28), 0 0 0 1px rgba(234,88,12,0.25)`). |

### Named Rules

**The Glass-Then-Glow Rule.** Surfaces are flat glass at rest. Shadow and glow are responses to state (hover, focus, "passed", active), not decoration.

**The Warm Shadow Rule.** Colored shadows are always warm (`rgba(239,45,45,x)` or `rgba(255,138,61,x)`). Neutral depth uses black in the dark theme and slate `rgba(30,41,59,x)` on daylight. No cyan or violet shadows outside the horizon atmosphere.

**The Inset Highlight Rule.** Every gradient-filled control carries `inset 0 1px 0 rgba(255,255,255,0.25)`; glass panels carry it at 0.08 (0.9 on daylight). It is what makes a fill read as a lit surface.

## Shapes

- **Radius scale as shipped.** `0.5rem` (inputs, utility buttons, dropdown items, 64px thumbnails, `lb-thumb`) · `0.75rem` (glass cards in the Lab aside and flight nodes, dropdown menus) · `0.9rem` (`btn-launch`, `btn-ghost`, `lb-img`) · `1rem` (`hud-strip`, `gallery-tile`, `sim-tile.is-mini`, `rounded-2xl` feed and profile cards) · `1.25rem` (`sim-tile`, `commander-card`, `empty-glyph`) · `1.5rem` (`cosmic-panel` on About) · pill `9999px` (every chip, badge, tag, segment, `sim-play`, avatars, nebulae) · `50%` (planet discs). Focus rings round at 6px.
- **Hairlines.** 1px borders everywhere; 2px only for the flight line (dashed), waypoint dots, HUD corner brackets and the nav underline. Dashed strokes mean orbit or trajectory (`orbit-ring`, `avatar-orbit .ring-a`, `flight-line`, `profile-stat` dividers).
- **Corner brackets.** `.snap-media::before/::after` draw 22px L-shaped brackets (2px, `nova-400`) at the top-left and bottom-right of a snap's media on hover, sliding in 8px along the diagonal.
- **Horizon.** The planet is a 175vw circle (max 2600px) whose top edge is the composition line: copy sits above it, the HUD strip rides it, the rocket launches from it.
- **Tile silhouette.** Sim tiles carry no aspect ratio; they fill whatever row or slot holds them (`height: 100%` in the Lab's `clamp(230px, 24vw, 330px)` rows, a fixed 128px as `.is-mini` in the rail, 150px in the phone swipe rail). The live canvas fills the tile; a bottom shade gradient (`rgba(5,5,8,0)` 30% → 0.45 at 62% → 0.92; deeper at 18% → 0.5 → 0.94 on `.is-open`; 25% → 0.55 → 0.9 on `.is-mini`) sits under the title lockup low-left. A category badge sits top-right (9px on mini); a static SVG mark top-left steps aside when a scripted scene exists (`[data-has-scene] .sim-mark { display: none }`). The base cover is `#0a0a16` with a red wash top-left (0.16) and a cyan wash bottom-right (0.10); slug-keyed tints override it.
- **Cover band.** `.commander-card` opens with a 4.25rem `.cc-cover` (ignition 0.55 and nebula 0.45 radial washes over a nova-to-plasma diagonal at 0.25 / 0.15); the `.avatar-orbit.is-small` (rings at -7px / -14px, 5px nova marker) overlaps it by 2.25rem.
- **Rocket glyph.** `#i-rocket` is a 24×24 authored symbol: body and fins in `currentColor`, window `var(--rocket-window, #7dd3fc)`, nozzle `var(--rocket-nozzle, #c4b5fd)`. It is rotated 45° on the progress bar, upright in the hero (climbing to 9°), and 180° on the flight path (descending the timeline) with a CSS flame.

## Components

### Buttons
- **Launch (primary).** `.btn-launch`: Space Grotesk 700 1rem, white, padding 0.9rem 2rem, radius 0.9rem, fill `linear-gradient(120deg, #ef2d2d 0%, #ff5f2d 55%, #ff8a3d 100%)`, CTA glow. A skewed white sheen (`::after`, 35% white, `skewX(-20deg)`) sweeps left to right over 0.5s on hover. Hover: `translateY(-2px) scale(1.02)`; active: `scale(0.97)`. Magnetic on pointer devices (leans up to 6px toward the cursor). Full-width small variant on About via `!py-3 !text-sm`. Light theme: unchanged (white on fire).
- **Ghost (secondary).** `.btn-ghost`: same geometry, weight 600, `text-body` on `rgba(255,255,255,0.04)` with a `rgba(255,255,255,0.15)` border and `blur(8px)`. Hover: plasma border `rgba(125,211,252,0.5)`, fill `rgba(125,211,252,0.08)`, lift 2px. Light: `light-text` on `rgba(255,255,255,0.6)`, slate border, hover to `light-plasma`.
- **Utility (Tailwind).** `bg-accent-500 hover:bg-accent-600 text-white rounded-lg text-sm font-medium` with `shadow-lg shadow-accent-500/25`: nav "Snap", Lab "Apply Filters" (`text-xs font-semibold`), the mobile create disc (56px circle, `active:scale-95`).
- **Pill outline.** `rounded-full border border-white/10 text-gray-400 hover:border-accent-400/30 hover:text-accent-400`: "Load More", 404 "Return Home" (`border-white/20`, `hover:bg-white/5`).
- **Play affordance.** `.sim-tile .sim-play`: pill, min-height 40px, Space Grotesk 700 0.95rem, fire gradient, small triangle SVG (`M8 5v14l11-7z`). Hover: `translateX(3px)` and deeper glow.

### Chips, tags and badges
- **`.snap-tag`** (Mission Log tags, Lab selected filters, "Coming Soon"): mono 10px 500 0.12em uppercase, `nova-400` on `rgba(255,138,61,0.09)` with a `rgba(255,138,61,0.24)` border; hover brightens to `nova-300` on 0.2 / 0.5. Light: `light-nova` on `rgba(234,88,12,0.07)`.
- **`.feed-chip`** (home feed tag filter, `nav.feed-filter`): Inter 600 0.8rem pill, padding 0.45rem 0.95rem, `text-lede` on `rgba(255,255,255,0.06)` with a 0.08 hairline; hover white on 0.1; `.is-active` wears `linear-gradient(120deg, #ef2d2d, #ff8a3d)`, a transparent border and the chip glow. The row scrolls horizontally with the scrollbar hidden (`padding-bottom: 0.35rem`) and is server-driven: `?tag=` links back to `#mission-log`. Light: `light-text-soft` on white with `light-border`; active keeps a gradient, deepened to `#dc2626` → `#ea580c`.
- **`.sim-badge`** (category, top-right of a tile): mono 10px 0.2em, `plasma-300` on `rgba(5,5,8,0.55)` with `blur(6px)`; 9px with 0.2rem 0.5rem padding on `.is-mini`.
- **`.flight-type`** (event type): mono 10px 0.18em, `plasma-300` on `rgba(125,211,252,0.08)` / 0.22 border. Light: `light-plasma-deep`.
- **`.tile-type`** (gallery "Video"): mono 9px 0.18em, `nova-300` on `rgba(5,5,8,0.65)`, top-right of a tile.
- **`.loadout-chip`** (About equipment): Inter 600 0.78rem, `text-soft` on `rgba(255,255,255,0.05)`; hover nova border 0.5, fill 0.08, lift 2px. Owner-authored emoji are allowed inside these chips.
- **Tag filter pills (Tailwind).** Active: `bg-accent-500 text-white` (desktop adds `shadow-lg shadow-accent-500/25`); rest: `bg-white/[0.06] text-gray-300/400 hover:bg-white/[0.1] hover:text-white`. Year filters use the outline idiom: active `border-accent-400/50 text-accent-400 bg-accent-400/5`, rest `border-white/10 text-gray-500`.
- **`.segmented`** (Highlights type filter): pill group on `rgba(255,255,255,0.05)`, 0.25rem padding and gap; items 0.4rem 1.1rem, 0.8rem 600, `text-muted`; `.seg-active` wears `linear-gradient(120deg, #ef2d2d, #ff8a3d)` with the segment glow. Light: white track, `light-text-dim` items.

### Cards / Containers
- **`.glass-card`** (the default surface; 15 templates): glass fill and hairline, `blur(12px)`, radius `rounded-xl`/`rounded-2xl`, padding `p-4` to `p-8`. Hover: fill 0.06, border 0.15. Light: white, `light-border`, `0 1px 3px` shadow.
- **`.snap-card`** (Mission Log field report; `glass-card snap-card spotlight rounded-2xl`): author row (40px avatar or ignition-gradient initial, name, mono `T−` timestamp), `.snap-media` carousel with HUD corner brackets on hover, body at 15px, `.snap-tag` row, then a hairline-topped action row ("Read report" → `nova-400` hover, "Share" → `ignition-400` hover). Hover lifts 2px with the card hover ring.
- **`.commander-card`** (home left rail; `glass-card commander-card`): radius 1.25rem, `overflow: hidden`, zero outer padding. Anatomy: `.cc-cover` band, the 4.5rem avatar in `.avatar-orbit.is-small` pulled up 2.25rem (`ring-2 ring-space-900`, or an ignition-gradient "S"), name (Space Grotesk 700 `text-base`), mono kicker "Cmdr · Sherwin Universe" (9px, 0.28em, `text-dim`), an 18-word subtitle in `text-xs text-gray-400`, then `.cc-stats`: three hairline-topped `.cc-stat` cells (mono 700 1.05rem `nova-400` `tabular-nums` values that count up via `data-count-to`; 9px 0.18em `text-muted` keys), then `.cc-link` "Commander profile" (hairline-topped, Inter 600 0.8rem `text-lede`, hover `nova-400` on 0.04 white). Light: `light-border` dividers, `light-nova` values, `light-text-dim` keys, `light-text-soft` link, hover on `#f9fafb`.
- **`.cosmic-panel`** (About commander card): a window into space that stays dark-toned in both themes, layered radial washes of ignition 0.12 / nebula 0.14 / plasma 0.08 over `linear-gradient(180deg, #0a0a16, #07070f)`, hairline border, `rounded-3xl p-8`. Light: same washes at 0.20 / 0.18 / 0.16 over white → `#f0f3fa`, `#e2e8f0` border, slate shadow.
- **`.hud-strip`** + **`.mission-stat`** (the hero stat strip): 2 × 2 → 1 × 4 hairline-divided cells, `.stat-value` counts up from 0 over 1.4s (cubic ease-out) when 40% visible, `.stat-label` in `nova-300` at 72%. The fourth cell is the `status-go` "GO" readout.
- **`.profile-stat`** (About key/value rows): dashed hairline dividers, mono key 10px 0.22em `text-dim`, mono value 1.05rem 700 `nova-400`.
- **`.gallery-tile`** (Highlights masonry item): glass, radius 1rem, `cursor: zoom-in`; image scales to 1.06 over 0.7s on hover; `.tile-caption` (caption, `nova-300` tags, mono "Open →") rises 10px into view over a bottom black gradient; always visible on touch (`hover: none`).
- **`.empty-glyph`** (empty states): 4.5rem rounded square (1.25rem), `nova-400` glyph on `rgba(255,138,61,0.08)` with a 0.22 nova border; holds an authored sprite glyph (`#i-satellite` on Timeline, `#i-antenna` on Highlights) or an inline stroke icon; floats on a 6s loop.
- **Dropdown menu.** `bg-space-800 border border-white/10 rounded-xl shadow-xl w-36`, items `px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5`; destructive item hovers `text-red-400` and confirms inline.
- **Toast.** `bg-accent-500/90 backdrop-blur-sm text-white text-sm font-medium rounded-xl shadow-lg shadow-accent-500/25`, slides in from the right over 300ms, auto-dismisses at 3s.
- **Post carousel** (`snaps/includes/image_carousel.html`): `.carousel-track` slides on `transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)` inside a `bg-space-900` frame whose height eases to the current slide over 300ms; 36px `bg-black/60` arrows, a `bg-black/60` pill counter top-right, white dot indicators (active 10px wide). Touch: a 40px horizontal swipe moves one slide, both inline and in the full-screen viewer (`z-[100]` black, 40px / 48px `bg-white/10` controls, arrow keys and Escape). Reduced motion: the track snaps.
- **Lightbox.** The Highlights image viewer; see Highlights Lightbox under the signature components.

### Inputs / Fields
- **Search.** `type="search"` in the nav: `bg-space-800 border border-white/10 rounded-lg text-sm` (`rounded-xl` on phone), 2.25rem left padding for a 16px stroke magnifier, placeholder "Scan the universe..." in `text-dim`. Focus: `border-accent-400/50` plus `ring-1 ring-accent-400/20`, `outline-none`. HTMX live search on a 300ms keyup delay into `#snap-feed`. Light: `rgba(255,255,255,0.15)` fill inside the dark nav.
- **Checkbox.** `h-4 w-4 rounded border-white/20 bg-white/5 text-accent-400 focus:ring-accent-400/30`.
- **Global focus.** `:focus-visible { outline: 2px solid #38bdf8; outline-offset: 3px; border-radius: 6px }`. `accent-color` and `caret-color` are nova.

### Navigation
- **Desktop `glass-nav`.** `rgba(8,8,16,0.8)` with `blur(20px)` and a `rgba(255,255,255,0.06)` bottom hairline; sticky, `z-50`, `py-4`. Logo lockup: 32px SVG mark (`rounded-lg`, `shadow-accent-500/25`, lifts and rotates 6° on hover) + "Sherwin" (Space Grotesk 600 lg, `tracking-wide`) + "Universe" (Space Grotesk 700 sm, `gradient-text-fire`).
- **`.nav-link`.** Inter 500 `text-sm tracking-wide`, `text-muted` → white on hover; a 2px fire-gradient underline grows from the left over 0.25s. `.nav-link-active` is white with the underline held and glowing (`0 0 8px rgba(255,77,77,0.7)`).
- **Theme toggle.** 20px stroke sun / moon icon, `text-gray-400 hover:text-white` (`hover:text-accent-400` on phone). Toggling writes `data-theme` on `<html>` and `localStorage.theme`; the head script sets it before first paint (default `dark`).
- **Phone.** Header with expanding search and hamburger (`x-transition` sheet of `block py-2 text-gray-400 hover:text-accent-400` links). Fixed bottom nav: five cells (Home, Timeline, create, Gallery, Lab), 20px 1.5-stroke icons over 11px labels in `text-dim`, hover `ignition-400`; the centre is a raised 56px ignition disc with a 2.5-stroke plus.
- **Skip link.** `.skip-link` hidden off-canvas until focused, then `top: 1rem`: nova fill, `space-900` text, 700 0.9rem, radius 0.7rem.
- **Footer.** Hairline-topped, `text-sm text-gray-500` copyright, mono 10px `tracking-widest` coordinates (desktop only), and the `status-go` pulsing dot with mono uppercase "All systems go".

### Launch Hero (signature)
`.launch-hero` on Home. States: `is-launched` (rocket runs `rocket-liftoff` 2.6s to `translate(34px, calc(-1 * var(--climb, 40vh))) rotate(9deg)`; `--climb` is set by JS to 0.47 × the hero's height, 0.55 under 768px, and re-set on resize, so the rocket ends in clear sky on any screen; the flame ignites and flickers at 0.12s, smoke puffs for 1.8s), `is-instant` (same classes with 0.01s durations for repeat visits and reduced motion), `.horizon-disc.is-poked` (0.9s bounce wobble, plus `SherwinCosmos.burst(4)` shooting stars). The `[data-countdown]` label reads `Mission Control · Online` at rest, steps `T-3 / T-2 / T-1 / Liftoff` at 380ms, then becomes a live `T+{d}d hh:mm:ss` clock from `data-mission-start`. `sessionStorage.su-launched` makes the countdown once-per-session. On scroll the rocket track climbs `0.95 × hero height` and drifts 70px right while the horizon sinks `0.32 × hero height`; `[data-scrub="out"]` fades the copy to 0.15 as it leaves. Distant bodies move on mouse parallax (`data-depth` 0.35 and 0.7). The rocket track anchors at 72% / 62% of the hero (78% / 66% on phones, where the rocket is 52px, the far planet moves to the top-left at 40px and the moon is hidden so the headline owns the sky). Light theme: white headline becomes `light-heading`, the disc turns to a cream-to-lavender-to-sky daylight planet, the rocket body goes `#1f2937`.

### Sim Tile (signature)
`.sim-tile` (Lab shelf as `.is-open`; home Launch Bay rail and phone swipe rail as `.is-mini` via `includes/sim_tile_mini.html`). Anatomy: `canvas.sim-preview` (procedural attract scene chosen by `pickScene(slug)`: gravity for `gravit|orbit|gunner`, hydraulics for `hydraul|press|piston`, nucleus for `nuclear|decay|atom|reactor`, artillery for `tank|artiller|siege|cannon`, else a comet fallback), `.sim-shade`, optional `.sim-mark` (authored SVG from `static/images/sim-icons/`), `.sim-badge`, and `.sim-tile-body` with `.sim-title`, optional `.sim-tags`, `.sim-desc`, `.sim-play`. The scene never draws edge to edge: `initSimPreviews` sizes a centred virtual box (`item.paint` translates by `item.offset`) whose height is 0.72 of the tile (0.56 on `.is-open` so the always-open description stays clear, 0.92 on `.is-mini`) and whose width is capped at 1.75 × that height, so a wide row keeps the scene's proportions. The hydraulics scene (an industrial press cycling on a test block: fluid, gauge, heat, sparks) and the artillery scene (a tank) share drawing helpers: `steel()` paints a brushed post or plate with a `#1b2433 → #5c6f8a → #9fb3cc → #4b5d78 → #141c28` gradient and a 12% white stroke, `bolt()` a `#e2e8f0 → #475569` radial rivet, and `lerpColor()` blends the block from steel toward `#ffd08a` / `#ef2d2d` as heat rises. States: hover / `:focus-visible` lift 4px (2px on mini), nova border 0.5, tile hover shadow, preview scales 1.04, a plasma scanline sweeps top to bottom over 0.9s, the description expands (max-height 6.5rem) and the preview animation speeds to 2.4×. Variants: `is-open` (Lab: description always open, deeper shade); `is-mini` (128px tall, radius 1rem, body is a flex row with the 1rem title left and a 32px "Play" pill right, description hidden, 9px badge). `[data-has-scene]` hides the static mark; `data-sim` slug substrings select a cover tint (gravity/gunner → red + violet on `#0a0714`; hydraul/press → cyan on `#060b16`; nuclear/decay/atom → violet + nova on `#0a0616`; tank/artiller/siege → navy-to-olive). Touch: description always open. Light: slate shadow, `rgba(30,41,59,0.15)` border, ember ring on hover. The `.is-featured` rules (larger title, open description, deeper shade) remain in the stylesheet but no template uses them since the home grid was retired.

### Flight Path (signature)
`.flight-path` on Timeline. A 2px dashed plasma line, `.flight-year` headings with 14px dots, `.flight-node` cards with 12px dots, `.flight-type` and `.flight-date` readouts. `.flight-marker` (the rocket glyph, 34px, rotated 180°, CSS flame) follows the scroll at 42% of the viewport; each waypoint becomes `is-passed` when the marker reaches it (year dot fills ignition with a red halo, node dot fills nova with a cream border, the card border warms to nova 0.28). Reduced motion: marker hidden, every waypoint lit.

### Highlights Lightbox (signature)
`.lightbox` on Highlights (Alpine `lightbox()`, `z-[70]`, `bg-black/90 backdrop-blur-md`, `role="dialog"`). Three rows: `.lb-bar` (mono `01 / 08` counter in `text-muted` at 0.25em, a 2.75rem `.lb-btn` close), `.lb-stage` (two 2.75rem `.lb-nav` arrows, 25% opacity when disabled at the ends, hidden under 768px; `.lb-figure` up to 1100px holding `.lb-img` at `max-height: calc(100vh - 13rem)`, radius 0.9rem, the lightbox shadow, and a `.lb-caption` in `text-lede` 0.9rem, max 40rem), and `.lb-strip` (a snap-scrolling filmstrip of 64 × 44 `.lb-thumb` at 45% opacity with a 0.12 hairline; `.is-active` is full opacity with a `nova-400` border, the thumb glow and a 2px lift, and scrolls itself to centre). Controls are `rgba(255,255,255,0.1)` pills, hover 0.2 and `scale(1.06)`. Navigation: arrow keys, Escape, a 40px swipe, thumbnail click, or a click on the stage to close; `document.documentElement.style.overflow` locks the page while open. Transitions are direction-aware WAAPI: the current image leaves over 150ms `ease-in` to `translateX(-36px × dir) scale(0.98)`, the next enters over 380ms `cubic-bezier(0.16, 1, 0.3, 1)` from `+36px × dir` once loaded (700ms fallback); neighbours are preloaded. Reduced motion: a plain swap.

## Do's and Don'ts

### Do:
- **Do** open every sector page with `.hud-label` reading `Sector NN · Name`, then the Space Grotesk H1 with one word in `gradient-text-fire`, then a one-sentence intro in `text-muted`/`text-dim` at `text-lg`, `mb-12` before content.
- **Do** build warm gradients red → orange (`#ef2d2d` → `#ff8a3d`, with `#ff5f2d` at 55% on fills and `#ffd08a` as the text end), and reserve `gradient-text-cosmic` for the hero.
- **Do** keep surfaces as glass (`rgba(255,255,255,0.03)` + 1px `rgba(255,255,255,0.08)`) and express state with a warm ring, a black shadow and a 2px to 4px lift.
- **Do** use `cubic-bezier(0.16, 1, 0.3, 1)` for every entrance and transform (0.35s tiles, 0.7s reveals and image zooms, 0.9s hero lines), `cubic-bezier(0.34, 1.56, 0.64, 1)` only for toy feedback, and plain `ease` 0.2s to 0.35s for color, border and shadow.
- **Do** give every new light-theme variant an explicit rule scoped `[data-theme="light"] main .component` (or `footer`), and pair each accent with its deeper daylight partner.
- **Do** draw icons as inline stroke SVG (24 viewBox, `stroke-width` 1.5 to 2, round caps) or a sprite `<use href="#i-rocket|#i-satellite|#i-antenna"/>`; add new glyphs to the sprite in `base.html`.
- **Do** stop any loop when its element is off-screen or the tab is hidden (IntersectionObserver + `visibilitychange`), subscribe scroll work to the shared `onScroll` bus, and provide a still or an instant state under `prefers-reduced-motion`.
- **Do** size sim tiles from their container (Lab rows `clamp(230px, 24vw, 330px)`, rail tiles 128px / 150px), never with `aspect-ratio`; the preview fits its scene into a centred box (0.72 / 0.56 / 0.92 of the height, width ≤ 1.75 × height) so the lockup stays clear.
- **Do** move media with a direction-aware slide: a 40px swipe threshold, the incoming frame on `cubic-bezier(0.16, 1, 0.3, 1)` (0.38s lightbox, 0.5s carousel), the outgoing on a short `ease-in`, and a plain swap under reduced motion.
- **Do** write template copy in first person, plain and specific, in space-program vocabulary (mission, launch bay, mission day, T-minus, sector, commander), and title pages `X · Sherwin Universe` with a middle dot.
- **Do** bump `?v=` on `main.css` and `main.js` in `base.html` whenever they change.

### Don't:
- **Don't** box the hero in a card, lay sims out as an equal-card row, or render the Mission Log as a generic social feed; the horizon-riding HUD strip, the feed-first bridge (commander card | posts | Launch Bay rail) and the field-report brackets are the shape of this world.
- **Don't** add a standalone sims section back to Home; the Launch Bay is the right rail (a swipe rail above the feed on phones) and the Lab is the full shelf. Mini tiles carry a title and Play only, never a description.
- **Don't** use JetBrains Mono for headings, body copy or button labels, and don't set a HUD label in Inter (the 404 kicker does this and is not the pattern).
- **Don't** use emoji as UI icons; emoji belong only in owner-authored content (About loadout chips, snap bodies). Don't use text glyphs (`✦`, arrows) where an SVG should be.
- **Don't** put em-dashes in template copy (HTML comments are fine); don't title a page with ` - Sherwin Universe`.
- **Don't** ship cyan or violet shadows, solid nova fills (skip link and lit waypoint dots excepted), or a dark-theme accent on a white daylight card.
- **Don't** hard-code sims in templates; tiles are DB rows and scenes are keyed by slug in `pickScene`. Don't draw a sim twice (static mark plus live scene).
- **Don't** let the nav go light; it stays `glass-nav` dark in both themes.
- **Don't** replay the launch countdown on every page load; `sessionStorage.su-launched` gates it once per session.
- **Don't** add a new dependency or a build step; the system is Tailwind CDN config in `base.html`, `main.css` and `main.js`.
