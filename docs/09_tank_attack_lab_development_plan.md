# Tank Attack Lab Development Plan

## Goal
Build a full 3D, round-based artillery simulation named **Tank Attack Lab** (`tank-attack-lab`) in the existing Sherwin miniapps stack, with historically flavored tanks, dome objectives, return fire, and endless high score gameplay.

## 1. Miniapp Registration
- Add a new seed migration under `apps/miniapps/migrations/`.
- Register:
  - `name`: Tank Attack Lab
  - `slug`: tank-attack-lab
  - `template_name`: miniapps/tank-attack-lab.html
  - `is_active`: true
- Reuse existing slug-based routing in `apps/miniapps/views.py` and `apps/miniapps/urls.py`.

## 2. Frontend Template
Create `templates/miniapps/tank-attack-lab.html` with the standard simulation pattern:
- Breadcrumb and simulation container (`#simulation`).
- Description card below simulation.
- Shared CSS include: `css/miniapps.css`.
- Three.js import map and module bootstrap.
- Instantiate simulation class from `static/js/miniapps/tank-attack-lab.js`.
- Attach `VoiceAssistant` with:
  - `appSlug`: `tank-attack-lab`
  - AI endpoint: `/ai/assistant/`
  - `getStateFn`: simulation `getState()`.

## 3. Simulation Core (3D)
Create `static/js/miniapps/tank-attack-lab.js`:
- Build a stationary hull + rotating turret/cannon scene.
- Camera supports orbit and zoom (desktop + mobile).
- Single source of truth state model for gameplay.

### 3.1 Tanks (initial roster)
- M109
- ISU-152
- Karl Gerat
- KV-2

Each tank has configurable stats:
- max range (>= 10 km)
- caliber (>= 140 mm)
- shell velocity
- reload time
- health
- dispersion/accuracy

Gameplay tuning target: historically flavored, not strict simulation.

### 3.2 Domes
Randomly spawn domes with constraints:
- Minimum distance: 1 km
- Random heading and distance within selected tank envelope
- Types:
  - Armored dome (150 mm gun)
  - Mini dome cluster (3 domes, 50 mm each)
  - Large dome (300 mm gun)

Balance rules:
- Larger caliber domes have higher HP and stronger outgoing damage.
- Larger domes have longer reload to compensate.

### 3.3 Round System
- Endless mode.
- Round 1: 1 dome objective.
- Round N: N dome objectives.
- Advance when all objectives in round are destroyed.

### 3.4 Fire-Control Workflow
Player may:
- Use rangefinder for selected dome, or
- Eyeball shot inputs without rangefinder.

Shot input includes:
- shell type (`AP`, `HE`, `Fragmentation`)
- heading
- elevation

Shell match preference:
- AP: armored domes
- HE: large domes
- Fragmentation: mini clusters

Mismatch behavior:
- Strong damage penalty (not hard zero).

### 3.5 Ballistics
Use a hybrid model:
- Visible arc/projectile travel in 3D.
- Deterministic hit window driven by heading/elevation/range error + dispersion.
- Enough realism for correction-based play, while staying responsive.

### 3.6 Return Fire and Loss Condition
- Domes fire back on timers.
- Tank cannot move; only turret can rotate.
- Tank health decreases from incoming hits.
- On zero health: explosion effect + game over.

## 4. UI Layout Contract
Follow existing Sherwin Lab panel grammar:
- Top-center: presets (quick tank/loadout start)
- Top-left: controls
  - tank selector
  - shell type
  - heading/elevation inputs
  - rangefinder and fire controls
- Top-right: status/specs
  - tank stats
  - selected target telemetry
  - player health
- Bottom-left: contextual actions
- Bottom-right: history/log
  - fire events
  - hit/miss reasons
  - destruction timeline

## 5. Scoring and Leaderboard
- No final win state.
- Endless high score progression.
- Score factors:
  - dome destruction
  - round progression
  - accuracy and efficiency bonus
- Store top scores in local storage.
- Show leaderboard in UI (current run + best runs).

## 6. AI Assistant Integration
Create `apps/ai_tools/simulations/tank_attack_lab.py` and import it in `apps/ai_tools/views.py`.

Assistant scope:
- Explain current selected tank specs.
- Compare any supported tank.
- Explain shell/ammo usage and matching.
- Keep concise educational responses (2-4 sentences).

Include:
- `system_prompt`
- `build_context(app_state)`
- `fallback(message, app_state)`
- registry registration with aliases.

## 7. Public API Contract
Expose at minimum in JS class:

```javascript
export class TankAttackLabApp {
  constructor(containerId) {}
  async init() {}
  getState() { return {}; }
  dispose() {}
}
```

`getState()` should include:

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

## 8. Quality Checklist
- No console errors.
- Playable on desktop and mobile.
- Compatible with light/dark theme baseline.
- Graceful AI fallback if backend unavailable.
- Proper cleanup in `dispose()`.
- Lab card appears via seeded migration and route works.

## 9. Implementation Order
1. Create migration seeding Tank Attack Lab.
2. Create template HTML file.
3. Implement JS simulation core and UI panels.
4. Add leaderboard + persistence.
5. Add AI simulation assistant module.
6. Wire AI module import in `apps/ai_tools/views.py`.
7. Run checks and smoke test app load + gameplay loop.
