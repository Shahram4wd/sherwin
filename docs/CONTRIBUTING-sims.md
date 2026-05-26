# CONTRIBUTING — Lab Simulations

This guide walks you through adding a new simulation to the Sherwin Universe
Lab framework introduced in `docs/10_lab_framework_refactor_plan.md`.

The Lab framework is intentionally framework-light: there's no bundler, no
TypeScript, no virtual-DOM. Sims are vanilla ES modules loaded through an
HTML `<script type="importmap">` and wrapped in a small JS shell that
handles the boring parts (fullscreen, error boundary, telemetry, AI panel,
help overlay, debug overlay, reduced-motion, focus trap).

---

## TL;DR — adding a new sim

1. **Pick a slug.** Lowercase, hyphenated. Must match the `MiniApp.slug`
   row in the admin (`/admin/miniapps/miniapp/`).
2. **Create three files** in `static/js/lab/sims/<slug>/`:
   - `index.js` — your sim's main module, exporting a class.
   - `manifest.js` — describes capabilities + help text.
3. **Create one template** in `templates/miniapps/<slug>.html` that
   extends `miniapps/_base_lab.html`. Override `sim_intro_hints`.
4. **(Optional) AI assistant.** Add
   `apps/ai_tools/simulations/<slug>.py` registering a
   `SimulationAssistant` (see existing sims for the pattern).
5. **(Optional) Admin row.** In `/admin/`, create or update the `MiniApp`
   row with `slug=<your-slug>`, `template_name=miniapps/<slug>.html`,
   and `is_active=True`.

That's it. No JS bundler step. No build script. No test harness wiring.

---

## The sim contract

Your `App` class needs three methods. LabShell calls them at the right
time and recovers gracefully if anything throws.

```js
// static/js/lab/sims/my-sim/index.js
import { SceneManager, UIPanel, clamp } from '@lab/core';

export class MySimApp {
  /** @param {string} containerId — id of the stage element (LabShell sets this). */
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  async init() { /* build scene, attach listeners */ }
  getState()    { return { /* small JSON for AI + debug overlay */ }; }
  dispose()     { /* stop RAFs, remove listeners, free WebGL */ }

  // Optional — LabShell auto-detects:
  pause()  { /* called on tab hide */ }
  resume() { /* called on tab show */ }
  onResize(w, h) { /* stage size changed */ }
}
```

See `static/js/lab/types.js` for the full JSDoc typedefs.

---

## The manifest

```js
// static/js/lab/sims/my-sim/manifest.js
import { MySimApp } from './index.js';

/** @type {import('../../types.js').LabSimManifest} */
export default {
  slug: 'my-sim',
  name: 'My Simulation',
  AppClass: MySimApp,
  capabilities: {
    three: true,       // sim uses Three.js (declares <script importmap "three">)
    twoD: false,       // sim uses 2D canvas (use Canvas2DStage helper)
    ai: true,          // enable AI assistant
    fullscreen: true,  // show fullscreen toggle in toolbar
  },
  persistence: { namespace: 'my-sim', version: 1 },
  help: `<h3>How to play</h3><ul><li>...</li></ul>`,

  // Rare: extra importmap entries (must start with a leading comma).
  // extraImportmap: { '@some/lib': 'https://...' },
};
```

---

## Logical imports

The `_base_lab.html` template publishes these specifiers via the page's
`importmap`. Always prefer the logical name; never `import './engine.js'`.

| Specifier                     | What it gives you                       |
| ----------------------------- | --------------------------------------- |
| `three`                       | Full Three.js (only if `capabilities.three`) |
| `three/addons/...`            | Three examples (e.g. OrbitControls)     |
| `@lab/core`                   | `SceneManager`, `UIPanel`, `ParticlePool`, `Canvas2DStage`, math helpers, color helpers, `THREE` re-export |
| `@lab/shell`                  | `LabShell` (you usually don't import this yourself) |
| `@lab/ai/voice-assistant`     | `VoiceAssistant` (LabShell wires it for you) |

For one-off third-party libs, declare them via `manifest.extraImportmap`
and they will be merged into the page's `importmap` automatically.

---

## Persistence

Use the namespaced storage helper LabShell provides. It survives version
bumps in your sim cleanly:

```js
const store = shell.storage('high-scores', 1);
store.set('best', 12345);
const best = store.get('best', 0);
```

> Inside your sim, you don't have direct access to `shell`. Use plain
> `localStorage` keyed by `'lab.<slug>.<namespace>.v1.<key>'` to match the
> shell's format if you need parity.

---

## Loading assets

```js
const data = await shell.loadData('/static/data/isotopes.json');
```

`loadData` uses `cache: 'force-cache'` by default and surfaces any HTTP
error so LabShell's error boundary catches it during `init()`.

---

## Telemetry events

LabShell auto-emits: `sim.opened`, `sim.disposed`, `sim.fullscreen`,
`sim.pause`, `sim.resume`, `sim.error`, `sim.ai.opened`, `sim.ai.message`.

You don't need to emit these. If your sim has a custom milestone you want
to track (e.g. a level cleared), have the sim accept the shell at
construction time and call `shell.track('mysim.level_cleared', { level })`.

The endpoint is `/api/lab-telemetry/events/` (Django app
`apps.lab_telemetry`). Events are batched via `navigator.sendBeacon`.
`Do Not Track` users send no telemetry.

---

## Accessibility checklist

- All buttons in your sim's `UIPanel` are real `<button>` elements.
- Sliders use `<input type="range">` with associated `<label>`.
- Color cues are paired with text or icons.
- Respect `shell.reducedMotion` (boolean) by skipping camera shakes,
  long-duration eases, etc., when it is `true`. The `.lab-reduced-motion`
  CSS class is also placed on the shell root so pure-CSS animations can
  honor the preference automatically.

---

## Debug overlay

Append `?debug=1` to the URL, or run `localStorage.lab_debug = '1'` once,
or press `Ctrl+Shift+D` to toggle. The overlay shows live FPS, frame
time p50/p95, and a JSON dump of `sim.getState()` at 2 Hz.

Keep `getState()` cheap and shallow. It runs at 2 Hz and also is read by
the AI assistant.

---

## AI prompts (optional)

Each sim's AI personality lives at `apps/ai_tools/simulations/<slug>.py`
and registers via `registry.register(SimulationAssistant(...))`. Keep the
runtime state structure stable across versions; the `build_context`
callback receives the JSON your sim sent via `getState()`.

---

## What to skip in a PR

- Splitting your sim's `index.js` into many small files. Single-file
  sims are fine; split only when a single file consistently triggers
  merge conflicts or exceeds ~3000 lines.
- Adding a build step or TypeScript. The framework intentionally
  doesn't have either.
- Writing your own fullscreen / help / error / telemetry. LabShell
  already does these.
