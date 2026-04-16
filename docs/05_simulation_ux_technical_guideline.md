# Simulation UX + Technical Guideline (Based on Nuclear Decay)

Purpose: help you build new simulations (for example, hydraulics) with the same Sherwin Lab experience, not a totally different product feel.

## 1. What To Keep Consistent

### 1.1 Product pattern
- Each simulation is a MiniApp DB record + one template + one JS module.
- The lab list is dynamic from DB records.
- The simulation page always has:
  - breadcrumb
  - full interactive canvas container
  - short description card under simulation
  - optional AI assistant overlay

### 1.2 Visual language
- Shared style source: static/css/miniapps.css.
- Keep these primitives:
  - dark glass overlay panels
  - four-corner control/info/history layout
  - top-center preset pill bar
  - same button/slider visual grammar
  - same AI floating button and chat panel
- Keep spacing and density similar (compact control panels, large visual simulation area).

### 1.3 Interaction model
- Manipulate a small number of core variables in left panel.
- Reflect state in right info panel in real time.
- Show available actions in bottom-left panel (context-sensitive).
- Keep a running sequence/history in bottom-right panel.
- Presets at top center to make first interaction fast.

## 2. Current Nuclear Decay Implementation (Reference)

### 2.1 Seed + registration
- Seed migration registers the app: apps/miniapps/migrations/0002_seed_nuclear_decay.py.
- MiniApp model fields used:
  - slug
  - name
  - description
  - category
  - template_name
  - is_active

### 2.2 Routing + render
- /lab/ list and /lab/<slug>/ detail are handled in apps/miniapps/views.py.
- URL config in apps/miniapps/urls.py.
- Dynamic template resolution via MiniApp.get_template() in apps/miniapps/models.py.

### 2.3 Template structure
- Template file: templates/miniapps/nuclear-decay.html.
- Responsibilities:
  - load shared CSS: css/miniapps.css
  - provide #simulation container
  - load Three.js import map
  - init simulation class
  - init VoiceAssistant with:
    - appSlug
    - apiUrl
    - getStateFn
    - csrfToken

### 2.4 JS architecture
- Shared engine: static/js/miniapps/engine.js.
- Simulation logic: static/js/miniapps/nuclear-decay.js.
- NuclearDecayApp responsibilities:
  - load domain data
  - init SceneManager
  - build UI panels
  - update simulation state
  - render/animate
  - expose getState() for AI context

### 2.5 Domain data strategy
- Primary dataset: static/data/isotopes.json.
- Fallback heuristic when dataset missing isotope.
- Pattern to copy for new domains:
  - data first
  - heuristic fallback
  - explicit flag when value is estimated

### 2.6 AI assistant integration
- Frontend voice/chat UI: static/js/miniapps/voice-assistant.js.
- Backend endpoint: /ai/assistant/ in apps/ai_tools/urls.py.
- Backend logic: apps/ai_tools/views.py.
- Prompting is keyed by app_slug in SYSTEM_PROMPTS.
- App state passed as app_state (JSON) with recent chat history.

## 3. Technical Contract For Any New Simulation

### 3.1 Required files
- static/js/miniapps/<new-slug>.js
- templates/miniapps/<new-slug>.html
- optional static/data/<domain>.json
- migration to seed MiniApp record

### 3.2 Required JS public API
Your simulation class should expose this minimum shape:

```javascript
export class NewSimulationApp {
  constructor(containerId) { /* ... */ }
  async init() { /* ... */ }
  getState() { return {}; }
  dispose() { /* ... */ }
}
```

### 3.3 Required getState() fields
Keep these generic fields so AI + UI patterns remain portable:

```json
{
  "primary": {},
  "metrics": {},
  "status": {
    "stable": true,
    "label": "...",
    "score": 0
  },
  "availableActions": [],
  "history": []
}
```

Note: include domain-specific keys too, but keep the above structure for consistency.

### 3.4 UI panel roles
- Top-left: builder controls (inputs/sliders/toggles)
- Top-right: computed outputs and status
- Bottom-left: actions/execution controls
- Bottom-right: timeline/history/log

### 3.5 Update loop pattern
- One state source of truth in class properties.
- Any state mutation calls a single update method (like _updateAllUI()).
- Render loop handles visuals only; business logic runs in explicit actions.

## 4. UX Guideline (Keep Similar Feel)

### 4.1 First 10-second experience
- User should be able to do one meaningful interaction immediately.
- Preset buttons should produce obvious visual change.
- Status should update instantly and visibly.

### 4.2 Feedback hierarchy
- Visual feedback: animation/particle/flow change.
- Numerical feedback: metrics panel values.
- Semantic feedback: status text (stable/unstable, safe/unsafe, efficient/inefficient).
- Historical feedback: log of transformations/events.

### 4.3 Language and tone
- Educational but concise.
- Child-friendly phrasing where possible.
- Action labels should be verbs (Run, Release, Inject, Open, Equalize).

### 4.4 Accessibility and responsiveness
- Keep panel text readable at mobile sizes.
- Preserve keyboard operability for buttons/inputs.
- Maintain light-theme overrides using existing [data-theme="light"] pattern.

## 5. Hydraulics Simulation Mapping (Recommended)

Use this direct mapping to preserve mental model while changing domain:

- Nuclear "builder" -> Circuit builder (pump, valve, reservoir, pipe)
- Z/N sliders -> Pressure/Flow/Valve aperture controls
- Stability -> System regime (stable flow, cavitation risk, pressure spike risk)
- Decay actions -> Hydraulic events (open relief valve, pump burst, leak, blockage)
- Decay chain history -> Event chain history
- Preset isotopes -> Preset circuits (domestic loop, hydraulic press, bypass loop)

Suggested panel content:
- Top-left: pump speed, valve %, reservoir head, pipe diameter
- Top-right: pressure, flow rate, Reynolds proxy, efficiency, risk badge
- Bottom-left: event controls (release pressure, open bypass, simulate leak)
- Bottom-right: event timeline

## 6. Data + Physics Design For Hydraulics

### 6.1 Data-first + heuristic fallback
- If a known scenario exists in dataset, use it.
- Else compute from simplified formulas and mark as estimated.

### 6.2 Suggested simplified model
- Pressure drop proportional to flow and resistance.
- Resistance depends on pipe diameter, length, and valve opening.
- Stability score based on:
  - pressure within safe band
  - smooth flow (not oscillating)
  - no abrupt spikes

### 6.3 Event/action model
Return object similar to decay apply function:

```javascript
{
  state: { /* new state */ },
  emitted: "Pressure release pulse",
  sideEffects: ["sound", "particle", "cameraFocus"]
}
```

## 7. AI Assistant Guidelines For New Simulation

### 7.1 Backend
- Add a new SYSTEM_PROMPTS entry for the new app slug in apps/ai_tools/views.py.
- Add context builder branch in _build_context() for new app_state shape.

### 7.2 Frontend
- Reuse VoiceAssistant with appSlug set to your new slug.
- Ensure getState() returns enough context for meaningful responses.

### 7.3 Prompt style
- 2-4 sentence answers
- explain controls first when user seems stuck
- reference current system state in each answer
- avoid over-technical explanations unless user asks

## 8. Delivery Checklist For A New Simulation

### 8.1 Engineering checklist
- Create template + JS file
- Register MiniApp seed migration
- Add optional dataset
- Implement init(), getState(), dispose()
- Reuse miniapps.css classes
- Wire VoiceAssistant
- Add app_slug prompt in ai_tools

### 8.2 UX checklist
- Similar panel layout and interaction rhythm
- Presets available
- Clear status language and color coding
- Action buttons only shown when valid
- History panel updates for each event

### 8.3 Quality checklist
- No console errors
- Works on mobile and desktop
- Light and dark theme acceptable
- Graceful fallback when AI/API unavailable

## 9. Suggested Starter Skeleton For Next App

```html
<!-- templates/miniapps/hydraulics-lab.html -->
<div id="simulation" class="miniapp-container"></div>
<script type="module">
  import { HydraulicsLabApp } from '/static/js/miniapps/hydraulics-lab.js';
  import { VoiceAssistant } from '/static/js/miniapps/voice-assistant.js';

  const app = new HydraulicsLabApp('simulation');
  await app.init();

  new VoiceAssistant({
    container: document.getElementById('simulation'),
    appSlug: 'hydraulics-lab',
    apiUrl: '/ai/assistant/',
    getStateFn: () => app.getState(),
    csrfToken: '{{ csrf_token }}',
  });
</script>
```

This keeps the same Sherwin Lab DNA while giving you full freedom to change the science domain.
