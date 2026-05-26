# Lab Observability + Accessibility Ticket

> Type: Follow-up to [10_lab_framework_refactor_plan.md](./10_lab_framework_refactor_plan.md) (§13).
> Scope: cross-cutting LabShell features that are independent of the structural
> refactor and can be picked up today.
> Status: **Implemented.** All three sections (A, B, C) landed alongside the
> lab framework refactor. Implementation notes are appended to each section.

This ticket bundles three small, related improvements that all live inside
`LabShell` and apply to every current and future simulation. They are grouped
because they share the same touch points (LabShell mount, toolbar, lifecycle
hooks) and the same test surface.

---

## A. Accessibility baseline in `LabShell`

**Problem.** Today the AI assistant panel, the mobile dock, and the UIPanel
toolbars have no consistent ARIA / focus / reduced-motion handling. Each new
sim risks regressing accessibility because there is no shared owner.

**Deliverables.**

1. **Focus trap inside the AI panel.** When `VoiceAssistant.open()` runs, trap
   Tab/Shift+Tab inside the panel; restore focus to the FAB on close.
2. **ARIA on shell chrome.**
   - Toolbar buttons: `aria-label`, `aria-pressed` for toggles (fullscreen, help).
   - Mobile dock: `role="tablist"`; each tab `role="tab"` + `aria-selected`.
   - AI panel: `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
   - Stage element: `role="application"` + `aria-label="{appName} simulation"`.
3. **`prefers-reduced-motion`.** `LabShell` adds a `lab-reduced-motion` class
   to the stage when the media query matches. Existing engine code (orbit
   damping, particle effects) reads `shell.reducedMotion` (boolean) and tones
   itself down. No sim needs to query `matchMedia` itself.
4. **Keyboard escape paths.**
   - `Esc` always closes (in priority): help overlay → AI panel → fullscreen.
   - Tab order: toolbar → stage (skip via `aria-hidden` on non-interactive
     decoration) → AI FAB → dock.

**Out of scope.**

- Per-sim control accessibility (sliders, buttons inside `UIPanel`) — covered
  in a future ticket once the per-sim splits in Phase C land.
- Screen-reader narration of 3D scenes.

**Acceptance.**

- `axe-core` run on each `/lab/<slug>/` page reports no Critical or Serious
  violations from shell-owned chrome.
- Manual: AI panel can be opened, used, and closed with keyboard only.
- Manual: `prefers-reduced-motion: reduce` visibly tones down ambient motion
  in at least one 3D sim.

---

## B. Dev-only debug overlay

**Problem.** Diagnosing slow frames or bad state today means sprinkling
`console.log` calls into per-sim files (which then get committed and removed
repeatedly). There is no shared, opt-in surface.

**Deliverables.**

1. `LabShell` reads `?debug=1` (or `localStorage.lab_debug === '1'`) on mount.
   When enabled, render a small overlay in the bottom-right of the stage
   containing:
   - **FPS** (1 Hz EMA over the last 60 frames).
   - **Frame time** (ms, p50 / p95 over the last 120 frames).
   - **Sim state** dump from `sim.getState()` (collapsed JSON, 2 Hz refresh).
   - **Build info** (commit SHA + build time, if exposed via a `<meta>` tag).
2. Toolbar gains a hidden "Debug" button visible only when debug mode is on,
   so the overlay can be toggled without reloading.
3. Overlay is keyboard-toggled with `Ctrl+Shift+D`.
4. The overlay's collection is gated — when debug is off, no FPS sampling or
   `getState()` polling happens (zero runtime cost in production).

**Out of scope.**

- Sending debug data anywhere (that's part C).
- A profiling timeline; this is a lightweight HUD, not Chrome DevTools.

**Acceptance.**

- Visiting `/lab/nuclear-decay/?debug=1` shows the overlay with live FPS.
- Visiting without `?debug=1` shows nothing and no extra `rAF` callbacks
  registered (verified via a unit test on `LabShell` internals or a manual
  performance trace).

---

## C. Telemetry hook (`LabShell.track`)

**Problem.** We have no answer to "which sim is used most, which controls
get clicked, how long does a session last." Without instrumenting now,
every sim will need a retrofit later.

**Deliverables.**

1. `LabShell.track(event, data)` — a stable, documented signature usable from
   any sim or panel:

   ```js
   shell.track('sim.opened',        { slug })                  // automatic
   shell.track('sim.fullscreen',    { entered: true })         // automatic
   shell.track('sim.ai.message',    { length: text.length })   // automatic
   shell.track('sim.control.click', { name: 'fire' })          // per-sim opt-in
   ```

2. **Transport (initial):** a thin `navigator.sendBeacon` POST to a new Django
   endpoint `POST /api/lab/telemetry/` that accepts a JSON envelope of events
   and writes them to a single `LabEvent` model (slug, event, props JSON,
   created_at, anon session id). No PII; no user FK unless authenticated.
3. **Batching:** `LabShell` buffers events and flushes on `pagehide`, on
   `visibilitychange→hidden`, or every 15 s, whichever comes first.
4. **Privacy:**
   - Honour `navigator.doNotTrack === '1'` → no-op.
   - Honour a future `Sherwin-Universe` cookie banner consent if one exists;
     until then, track only `slug`, `event`, `props` (no IP, no UA in JS-side
     payload — Django can drop IP at view time).
5. **Standard events emitted automatically:**
   - `sim.opened` / `sim.disposed`
   - `sim.fullscreen` (entered/exited)
   - `sim.ai.opened` / `sim.ai.message`
   - `sim.error` (from §12.5 error boundary)
   - `sim.pause` / `sim.resume` (from visibility change)

**Out of scope.**

- A dashboard or admin view to read telemetry. We can read raw rows in
  `manage.py shell` for now; a dashboard is a follow-up.
- Cross-session user identity / funnels.

**Acceptance.**

- Opening `/lab/nuclear-decay/`, toggling fullscreen, asking the AI a
  question, and closing the tab results in **one** beacon to
  `/api/lab/telemetry/` containing 4–5 events (`sim.opened`,
  `sim.fullscreen`, `sim.ai.opened`, `sim.ai.message`, `sim.disposed`).
- With `navigator.doNotTrack === '1'`, no network calls are made.
- A unit test on the Django endpoint round-trips a payload and persists a
  `LabEvent` row.

---

## Shared implementation notes

- All three pieces live in `static/js/lab/shell/`:
  - `a11y.js` — focus trap, ARIA wiring, reduced-motion class.
  - `debug-overlay.js` — FPS sampler + HUD.
  - `telemetry.js` — buffer + beacon transport.
- `LabShell` composes them; sims see them only via `shell.track(...)` and
  `shell.reducedMotion`.
- Django side adds one app or one view + one model:
  - `apps/lab_telemetry/` (preferred) **or** an endpoint inside
    `apps/ai_tools/` if we want to keep app count down.
- Migration order: A → B → C (a11y is the safest; telemetry needs the Django
  side, do last).

## Tests

- Django: unit test for `LabEvent` endpoint (valid payload, DNT short-circuit,
  oversized payload rejected, malformed JSON → 400).
- E2E (`tests/e2e/test_e2e.py`): one parametrised test asserting the AI panel
  is keyboard-reachable and that `?debug=1` renders the overlay.
- Manual checklist on each `/lab/<slug>/` page:
  1. `axe-core` clean on shell chrome.
  2. `?debug=1` shows live FPS, sim state.
  3. With network panel open, fullscreen + AI message produces one beacon.

## Estimate / sequencing

Three small PRs in order; each independently shippable.

1. **PR 1 — A11y baseline** (`lab/shell/a11y.js` + ARIA on existing nodes).
2. **PR 2 — Debug overlay** (`lab/shell/debug-overlay.js`).
3. **PR 3 — Telemetry** (JS + Django `LabEvent` model + endpoint).

---

**Depends on:** none structurally — this can be merged before the LabShell
refactor lands. If implemented before §10's Phase B, the same code moves into
`LabShell` cleanly during Phase B with no rewrite.
