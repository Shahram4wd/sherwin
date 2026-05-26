# Lab Simulation Framework Refactor — Development Plan

> Status: **Implemented** — initial framework landed; sim JS bodies were
> relocated as single files (no internal splits yet). Section 12.2 was
> intentionally **skipped**; see note at the top of §12.2.
> Owner: Lab platform refactor.
> Related docs: `00_project_roadmap_v2.md`, `03_phase3_ai_miniapps_v2.md`,
> `05_simulation_ux_technical_guideline.md`, `CONTRIBUTING-sims.md`,
> `lab_observability_a11y_ticket.md`.

## 0. Implementation status (post-landing)

- ✅ Phase A — folder structure under `static/js/lab/` created; shared core
  moved to `lab/core/` (`engine.js`, `canvas2d-stage.js`, `index.js` barrel);
  voice assistant moved to `lab/ai/`. Legacy `static/js/miniapps/` deleted.
- ✅ Phase B — `LabShell` (`lab/shell/lab-shell.js`) with toolbar, fullscreen
  (native + iOS pseudo-fullscreen fallback), help overlay, error boundary,
  loading state, namespaced storage, `loadData`, AI wiring, auto pause on
  tab hide, reduced-motion handling. Sub-modules: `fullscreen.js`,
  `telemetry.js`, `debug-overlay.js`, `a11y.js`. New base template at
  `templates/miniapps/_base_lab.html` carries the importmap.
- ✅ Phase C — each of the four sims now lives at
  `lab/sims/<slug>/index.js` (unchanged body, imports switched to
  `'@lab/core'`) plus a sibling `manifest.js`. The four sim templates were
  trimmed to ~10 lines each, just overriding `sim_intro_hints` (and, for
  hydraulics-lab, `extra_importmap`).
- ✅ Phase D — observability ticket (`lab_observability_a11y_ticket.md`)
  landed: Django `apps.lab_telemetry`, debug overlay, focus trap, ARIA.
- ⏭️ **Skipped — §12.2**. The existing registry pattern in
  `apps/ai_tools/simulations/<slug>.py` (which colocates prompt +
  `build_context` + fallback) is strictly more powerful than a flat
  `MiniApp.ai_system_prompt` TextField. Sim AI personalities remain
  Python-owned. Admin still gets a read-only window via `LabEvent`.
- ⏭️ Deferred (future tickets) — splitting any single sim's `index.js`
  into smaller modules. Doing this without a Playwright-grade test suite
  is risky; sims continue working as single files for now.

## 1. Motivation

The Lab is up to four interactive simulations (`nuclear-decay`, `gravity-gunner`,
`hydraulics-lab`, `tank-attack-lab`) and growing. Three problems are now blocking
further growth:

1. **No shared shell.** Each simulation template re-wires the same boilerplate:
   Three.js importmap, voice assistant, CSRF, `getState()`. There is no common
   place to add a *fullscreen toggle*, *help overlay*, *settings*, *share*,
   *pause-on-blur*, *loading state*, or future features (recording, presets,
   classroom mode). Adding any of these today means editing 4+ templates.
2. **JS files are getting huge and mixed.** Today's line counts:

   | File | Lines | KB |
   |---|---:|---:|
   | `tank-attack-lab.js` | **2059** | 81 |
   | `gravity-gunner.js`  | 1251 | 48 |
   | `nuclear-decay.js`   | 1195 | 46 |
   | `hydraulics-lab.js`  | 995  | 40 |
   | `engine.js` (shared) | 399  | 16 |
   | `voice-assistant.js` (shared) | 220 | 9 |

   Each per-sim file mixes constants, physics math, Three.js mesh building,
   UI/DOM, state, persistence, and the entry-point class. Editing one concern
   means scrolling through 2 000 lines.
3. **Flat folder, no convention.** Everything lives in `static/js/miniapps/*.js`.
   When we split files, they will all collide in the same flat directory.
   There is no agreed structure for sim-internal modules, shared core,
   shared widgets, or shared physics helpers.

## 2. Goals

- A single **`LabShell`** wrapper that any simulation can opt into and that
  centralises: container layout, fullscreen, AI assistant wiring, pause/resume
  hooks, error display, loading state, and future cross-cutting features.
- A clear, scalable **JS folder structure** that supports per-simulation
  internal modules without polluting the shared namespace.
- Each simulation broken into focused modules (≈100–400 lines each) covering
  a single concern (constants/data, physics, scene/visuals, UI panels, app
  orchestrator).
- **Zero functional regressions.** The refactor is structural only; the user
  experience and existing tests must keep passing.
- A template that adding a new simulation requires editing **one** template
  block (or none, if the default applies).

## 3. Non-Goals

- No bundler (Vite/webpack) introduction. Stay on native ES modules + CDN
  importmap as today (the importmap will be expanded with logical names — see §12).
- No TypeScript migration. We will use JSDoc `@typedef`s for the sim contract.
- No i18n / localization work. Everything stays English for now.
- No recorder / video-export feature.
- No change to the Django side of the AI assistant **endpoint shape**. We will,
  however, add an `ai_system_prompt` field to `MiniApp` so prompts live with the
  sim (see §12.2).
- No new gameplay or simulation features in this refactor.
- No CSS framework swap. We may add new BEM classes under `miniapps.css` only
  where the LabShell needs them (fullscreen button, toolbar, error card, etc.).

## 4. Current Architecture (snapshot)

```
static/js/
  main.js
  miniapps/
    engine.js           # SceneManager, ParticlePool, UIPanel, helpers (shared)
    voice-assistant.js  # VoiceAssistant (shared)
    nuclear-decay.js    # NuclearDecayApp + helpers + Nucleus3D + DecayEffects
    gravity-gunner.js   # GravityGunnerApp + helpers
    hydraulics-lab.js   # HydraulicsLabApp + PressureGraph + helpers
    tank-attack-lab.js  # TankAttackLabApp + TANKS/SHELLS/TARGETS + math + visuals
templates/miniapps/
  <slug>.html           # each duplicates importmap + module entry script
```

Per-template script today (paraphrased):

```html
<script type="importmap">…three @ jsdelivr…</script>
<script type="module">
  import { FooApp } from "{% static 'js/miniapps/foo.js' %}";
  import { VoiceAssistant } from "{% static 'js/miniapps/voice-assistant.js' %}";
  const app = new FooApp('simulation');
  await app.init();
  new VoiceAssistant({ container, appSlug, apiUrl, getStateFn: () => app.getState(), csrfToken });
</script>
```

The duplication and the absence of a wrapper is exactly what we are removing.

## 5. Target Architecture

### 5.1 Folder layout

```
static/js/
  main.js
  lab/                          # NEW — everything Lab-related lives here
    shell/
      lab-shell.js              # NEW — LabShell class (the common wrapper)
      fullscreen.js             # NEW — FullscreenController
      toolbar.js                # NEW — top-right toolbar (fullscreen/help/share)
      help-overlay.js           # NEW — optional help/instructions overlay
    core/                       # moved + split engine.js
      scene-manager.js
      particle-pool.js
      ui-panel.js
      helpers.js                # clamp, lerp, randRange, formatHalfLife, etc.
      index.js                  # re-exports + `THREE` re-export (back-compat)
    ai/
      voice-assistant.js        # moved from miniapps/voice-assistant.js
    physics/                    # NEW — reusable physics math
      ballistics.js             # projectile, drag (used by gunner + tank)
      pressure.js               # Pascal’s law (used by hydraulics)
    sims/
      nuclear-decay/
        index.js                # NuclearDecayApp (entry export)
        constants.js            # isotope tables, decay modes
        physics.js              # evaluateStability, applyDecay, neutron limits
        nucleus.js              # Nucleus3D
        effects.js              # DecayEffects
        ui.js                   # control + info panels
      gravity-gunner/
        index.js
        constants.js
        physics.js
        scene.js
        ui.js
      hydraulics-lab/
        index.js
        constants.js
        physics.js
        graph.js                # PressureGraph
        scene.js
        ui.js
      tank-attack-lab/
        index.js                # TankAttackLabApp
        constants.js            # TANKS, SHELLS, TARGETS, BARREL_VISUALS
        math.js                 # angle/heading/projectile helpers
        scene.js                # terrain + tank + barrel + targets
        visor.js                # FOV / aiming overlay
        ai-opponent.js          # cluster fire / AI behaviour
        ui.js                   # panels, HUD
        persistence.js          # score storage (STORAGE_KEY)
```

Notes:

- `lab/core/index.js` keeps a barrel of `SceneManager`, `ParticlePool`,
  `UIPanel`, `THREE`, and helpers so existing imports stay as a one-line change.
- A simulation’s entry remains a single class export from its `index.js`, so
  templates always import one symbol regardless of internal layout.
- `physics/` is a shared, dependency-free corner; sims may use it or not.

### 5.2 `LabShell` API (the common wrapper)

```js
// static/js/lab/shell/lab-shell.js
export class LabShell {
  /**
   * @param {Object} opts
   * @param {string|HTMLElement} opts.mount     // #simulation
   * @param {string}             opts.appSlug   // 'nuclear-decay'
   * @param {string}             opts.appName   // 'Nuclear Decay'
   * @param {Object}             opts.ai        // { apiUrl, csrfToken } | null
   * @param {Object}             opts.features  // { fullscreen, help, share, pauseOnBlur }
   * @param {string|HTMLElement} opts.help      // optional help HTML
   */
  constructor(opts) { … }

  /** Mount the chrome (toolbar, dock, AI fab) and return the inner stage element. */
  mount() { return this.stage; }

  /** Attach a Sim instance; LabShell wires getState→AI and lifecycle. */
  attach(sim) { … }   // expects sim.getState?, sim.pause?, sim.resume?, sim.dispose?

  /** Toggle / enter / exit fullscreen via Fullscreen API + fallback CSS. */
  enterFullscreen() { … }
  exitFullscreen() { … }
  toggleFullscreen() { … }

  /** Lifecycle hooks the shell calls automatically. */
  onFullscreenChange(cb) { … }
  onVisibilityChange(cb) { … }   // tab hidden → sim.pause(); shown → sim.resume()
  dispose() { … }
}
```

Sim contract (all optional, duck-typed):

```js
sim.init?()      → Promise<void>   // existing convention
sim.getState?()  → object          // for AI assistant
sim.pause?()     → void
sim.resume?()    → void
sim.dispose?()   → void
```

### 5.3 Template contract after refactor

A simulation template will look like this (using a new
`templates/miniapps/_base_lab.html` partial that owns the importmap + shell):

```html
{% extends "miniapps/_base_lab.html" %}
{% block sim_module %}js/lab/sims/nuclear-decay/index.js{% endblock %}
{% block sim_class  %}NuclearDecayApp{% endblock %}
{% block sim_help %}
  <li>Use sliders to build nuclei</li>
  <li>Trigger decay when unstable</li>
{% endblock %}
```

`_base_lab.html` will:

- inject the Three.js importmap once,
- instantiate `LabShell` with `appSlug=miniapp.slug`, `appName=miniapp.name`,
  AI config from `{% url 'ai_tools:assistant_chat' %}` + `{{ csrf_token }}`,
- dynamically `import()` the sim module path from the `sim_module` block,
- construct `new <sim_class>(stage)` and call `shell.attach(app)`.

Adding a new simulation becomes: drop a folder under `lab/sims/<slug>/`, create
a one-block template that names the module + class, register the `MiniApp`
row. No JS or template plumbing duplicated.

### 5.4 Fullscreen behaviour

- Toolbar button (top-right of the stage) toggles native Fullscreen API on the
  outer container.
- When fullscreen is unavailable (iOS Safari on iPhone), fall back to a
  CSS-driven `is-pseudo-fullscreen` class on the container (position:fixed,
  inset:0, z-index above site chrome).
- `Esc` exits; the shell broadcasts a `lab:fullscreen-change` event so sims
  can re-measure (`SceneManager` already listens to `resize`, so most sims
  will work for free).
- Mobile dock + AI FAB are repositioned via CSS while fullscreen is active so
  the chrome belongs to the stage, not the page.

## 6. Migration Strategy (phased, low-risk)

Each phase is independently shippable and individually testable.

### Phase A — Folder + shared core (no behaviour change)
1. Create `static/js/lab/` directories.
2. Move `engine.js` → split into `lab/core/{scene-manager,particle-pool,ui-panel,helpers}.js`
   and re-export from `lab/core/index.js`.
3. Move `voice-assistant.js` → `lab/ai/voice-assistant.js`.
4. Leave `static/js/miniapps/` in place but have each file import from the new
   `lab/core/index.js` and `lab/ai/voice-assistant.js`. This is the smallest
   diff (only import paths change) and proves the new layout works.
5. Update templates to point at new shared paths.
6. Smoke-test each sim manually + run `tests/test_miniapps`.

### Phase B — `LabShell` introduction (still no sim refactor)
1. Implement `LabShell`, `FullscreenController`, `Toolbar`, `HelpOverlay`.
2. Create `templates/miniapps/_base_lab.html` partial.
3. Migrate **one** simulation template (start with `nuclear-decay.html`, the
   smallest) to extend the base and use the shell. Verify AI + visuals work.
4. Migrate the remaining three templates one by one.
5. Add fullscreen toggle + pauseOnBlur. Add `tests/e2e` smoke for fullscreen
   button presence.

### Phase C — Per-simulation file splits
Migrate one sim per PR; each PR is mechanical (move code, add imports). Order
by size (smallest first to refine the recipe):

1. `hydraulics-lab.js` (995 lines) → `lab/sims/hydraulics-lab/*`.
2. `nuclear-decay.js` (1195) → `lab/sims/nuclear-decay/*`.
3. `gravity-gunner.js` (1251) → `lab/sims/gravity-gunner/*`.
4. `tank-attack-lab.js` (2059) → `lab/sims/tank-attack-lab/*` (largest, last).

Per-sim split recipe:

- `constants.js`: pure data (TANKS, SHELLS, ISOTOPES, default options).
- `physics.js` / `math.js`: pure functions, no DOM, no THREE imports unless
  strictly needed for vector math.
- `scene.js` / `nucleus.js` / `visuals.js`: Three.js mesh + material building.
- `ui.js`: UIPanel wiring, DOM creation, event handlers.
- `index.js`: the `*App` class that composes the above and exposes
  `init/getState/pause/resume/dispose`.

### Phase D — Delete `static/js/miniapps/` shim
Once all four sims live under `lab/sims/`, delete the legacy `miniapps/`
directory. Templates already point at `lab/` after Phase B.

## 7. Backwards Compatibility

- All public template URLs (`/lab/...`) and Django views are unchanged.
- The `MiniApp.template_name` mechanism is unchanged.
- During Phase A the shared modules live at both old and new paths
  (`miniapps/engine.js` re-exports from `lab/core/index.js`) so any
  half-migrated state is safe.
- After Phase D, only one canonical location exists.

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Native `import()` paths break in production due to `STATIC_URL` differences. | Always construct dynamic import paths from `{% static %}` in templates, never hard-code; cover with one e2e test that loads each lab page. |
| Hidden cross-file coupling in `tank-attack-lab.js` makes the split painful. | Do tank-attack last; first three splits set the recipe and uncover patterns. |
| iOS Safari lacks `Element.requestFullscreen` for non-video. | Pseudo-fullscreen CSS fallback already specified. |
| Pylance/ruff config changes for moved files. | None expected — JS isn’t linted by ruff; just verify VSCode resolves new paths. |
| Cache busting after path moves. | Existing `staticfiles` collection + hashed names handles it; bump deploy. |

## 9. Tests & Validation

- **Unit/integration** (existing): `pytest tests/test_miniapps` must remain
  green after every phase.
- **E2E** (`tests/e2e/test_e2e.py`): add a parametrised test that opens each
  `/lab/<slug>/` page, asserts the LabShell toolbar exists, and that the
  AI FAB is present.
- **Manual smoke checklist** per phase (added inline in the PR):
  1. Page loads with no console errors.
  2. AI assistant FAB opens chat and round-trips a message.
  3. Fullscreen button enters and exits (desktop + mobile pseudo).
  4. Resize behaves: 3D canvas re-fits.
  5. Tab away → sim pauses; tab back → sim resumes.

## 10. Deliverables (per phase)

- Phase A: PR “lab/core: relocate shared engine + AI to `static/js/lab/`”.
- Phase B: PR “lab/shell: introduce LabShell + `_base_lab.html`”.
- Phase C.x: 4 PRs, one per simulation split.
- Phase D: PR “lab: remove legacy `static/js/miniapps/` shim”.

## 11. Open Questions

1. Should `LabShell` also own keyboard shortcuts (e.g. `F` fullscreen, `?`
   help, `Space` pause), or leave that to each sim?
2. Do we want the help overlay to be authored in Markdown via the existing
   `MiniApp` model (new `instructions` field) instead of per-template HTML?
3. Should we add an optional `Recorder` feature (canvas → webm) in this
   refactor or defer to a follow-up?

## 12. Scalability Additions

These augment the structural refactor with conventions that pay off as the
Lab grows past today's four simulations. They are scoped *inside* the same
phased migration, not as a separate workstream.

### 12.1 Per-sim `manifest.js` + logical importmap

Each `lab/sims/<slug>/` exports a `manifest.js`:

```js
// lab/sims/nuclear-decay/manifest.js
export default {
  slug: 'nuclear-decay',
  name: 'Nuclear Decay',
  entry: '@lab/sims/nuclear-decay',         // resolved via importmap
  className: 'NuclearDecayApp',
  capabilities: { three: true, twoD: false, ai: true, fullscreen: true },
  ai: { systemPrompt: '…' },                 // see §12.2
  persistence: { namespace: 'nuclear-decay', version: 1 },
  assets: ['data/isotopes.json'],
  help: { source: 'template' },              // or 'markdown' once §11.2 lands
};
```

The Lab base template adds a logical-name importmap so internal sim modules
stop using fragile `../../core/` paths:

```html
<script type="importmap">
{
  "imports": {
    "three": "…",
    "three/addons/": "…",
    "@lab/core":     "{% static 'js/lab/core/index.js' %}",
    "@lab/ai":       "{% static 'js/lab/ai/voice-assistant.js' %}",
    "@lab/shell":    "{% static 'js/lab/shell/lab-shell.js' %}",
    "@lab/physics/": "{% static 'js/lab/physics/' %}",
    "@lab/sims/":    "{% static 'js/lab/sims/' %}"
  }
}
</script>
```

*Why:* `_base_lab.html` becomes truly generic — it imports the manifest, then
dynamically imports the entry. New sims do not edit the base template.

### 12.2 AI prompts colocated with the sim

> **Status: SKIPPED (intentionally).** The existing
> `apps/ai_tools/simulations/<slug>.py` registry pattern already colocates:
> system prompt **+ live `build_context(state)` builder + fallback response**.
> Moving prompts to a `MiniApp.ai_system_prompt` TextField would regress
> from "Python lambda with access to runtime state" to "static string"
> and would force every sim to lose its custom context shaping logic.
> The original problem (every new sim editing one shared Django file) is
> already solved — each sim has its own file under `apps/ai_tools/simulations/`.
> Leave this as-is. Admins can still view incoming telemetry via the
> `LabEvent` admin if they want to audit AI usage.

The rest of this subsection is left for historical context.

Today `apps/ai_tools/views.py` holds a `SYSTEM_PROMPTS` dict keyed by slug;
every new sim has to edit a Django file. After this refactor:

- Add a `MiniApp.ai_system_prompt` `TextField` (migration).
- The sim's `manifest.js` is the source of truth in the codebase; a small
  management command (`manage.py sync_miniapp_manifests`) reads each sim's
  manifest and updates the `MiniApp` row's prompt + name + capabilities.
- `ai_tools/views.py` reads `MiniApp.ai_system_prompt` instead of the
  hard-coded dict. The endpoint shape is unchanged.

*Why:* the sim owns its own AI personality; non-coders can still tweak the
prompt via Django admin.

### 12.3 JSDoc sim contract

Add `static/js/lab/types.js` (no exports; purely declarative):

```js
/**
 * @typedef {Object} LabSim
 * @property {() => Promise<void>}  [init]
 * @property {() => object}         [getState]
 * @property {() => void}           [pause]
 * @property {() => void}           [resume]
 * @property {() => void}           [dispose]
 * @property {(w:number,h:number) => void} [onResize]
 */
```

`LabShell.attach(sim)` is annotated `@param {LabSim} sim`. VS Code surfaces
contract drift without any build step.

### 12.4 Shared storage + data-loader helpers

`LabShell` exposes:

```js
shell.storage(namespace, version)   // → { get, set, remove, clear }
shell.loadData(url, { cache: true }) // → Promise<any>, shows loading UI, surfaces errors via §12.5
```

- `storage` wraps `localStorage` with the namespace + version from the
  manifest, and runs a `migrate(oldVersion, data)` hook when versions differ.
- `loadData` deduplicates concurrent fetches, caches by URL, and renders the
  shell's spinner overlay until the first asset resolves.

*Replaces today's ad-hoc `STORAGE_KEY` in `tank-attack-lab.js` and the bare
`fetch('isotopes.json')` in `nuclear-decay.js`.*

### 12.5 Error boundary + loading state

`LabShell` wraps `sim.init()` and any `loadData()` calls in try/catch. On
failure it renders an in-stage card:

```
┌──────────────────────────────────────┐
│  ⚠️  Couldn't start this lab.         │
│  <error.message>                      │
│  [ Reload simulation ]  [ Report ]    │
└──────────────────────────────────────┘
```

Loading state: a small overlay until either `sim.init()` resolves *or* a
300 ms grace window elapses (whichever is later) to avoid flicker.

### 12.6 `Canvas2DStage` companion to `SceneManager`

A new `lab/core/canvas2d-stage.js` with the same lifecycle surface as
`SceneManager` (`onTick`, resize listener, `start`/`stop`/`dispose`) but
backed by a plain `<canvas>` 2D context — for 2D sims (gravity-gunner,
hydraulics-lab today; many future ones). Sims select via
`capabilities.twoD: true` in the manifest; the base template can then skip
the Three.js importmap entries for that page if desired.

*Why:* avoids paying the ~600 kB Three.js bundle for sims that are 2D.

### 12.7 `CONTRIBUTING-sims.md`

A short checklist in `docs/`:

1. `python manage.py startsim <slug>` (small scaffolder — optional).
2. Create `lab/sims/<slug>/{index.js,manifest.js,constants.js,physics.js,scene.js,ui.js}`.
3. Create `templates/miniapps/<slug>.html` extending `_base_lab.html`.
4. Run `python manage.py sync_miniapp_manifests`.
5. Add a row in `tests/test_miniapps/test_views.py` (covered by the parametrised smoke test).
6. Smoke checklist from §9.

### 12.8 Migration phase mapping

| Item | Lands in |
|---|---|
| 12.1 manifest + importmap | Phase B (alongside `_base_lab.html`). |
| 12.2 AI prompt colocation | Phase B (new model field + sync command). |
| 12.3 JSDoc types | Phase B (added with `LabShell`). |
| 12.4 storage + loadData | Phase B (LabShell API). Adopted per sim during Phase C. |
| 12.5 error boundary + loading | Phase B (LabShell). |
| 12.6 `Canvas2DStage` | Phase A (sits next to `SceneManager` in `lab/core/`). Adopted by gravity-gunner / hydraulics-lab during Phase C. |
| 12.7 CONTRIBUTING-sims.md | End of Phase D. |

## 13. Follow-up Tickets (not in this refactor)

Tracked separately so the refactor PR series stays focused:

- `docs/lab_observability_a11y_ticket.md` — accessibility baseline (focus-trap,
  ARIA, reduced-motion), dev-only FPS/state debug overlay, and a telemetry
  `LabShell.track()` hook. Targeted for **today**.

---

**Next step:** confirm §5 + §12. On approval, begin Phase A.
