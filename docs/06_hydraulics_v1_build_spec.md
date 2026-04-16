# Hydraulics Simulation v1 Build Spec

This document locks v1 scope for the Sherwin Lab hydraulics simulation using the same UX language as Nuclear Decay.

## 1. Locked Product Decisions

- Dynamics: simple time-based dynamics.
- Material behavior: staged model (elastic deformation, yield, crush).
- Risk model: combined score from all key factors.
- Units: dual units with user toggle; SI/international defaults.
- Data policy: use curated real engineering ranges with sources.
- Visual behavior: mimic reality (early sponge deformation, high-strength metals may not deform in normal range).
- Event set: include all planned events (pressure spike, valve slam, cavitation warning, seal leak, emergency stop trigger).
- Success criteria: none; simulation is exploratory.
- AI scope: explain current experiment state and ongoing behavior.
- Responsive strategy: mobile first.
- Performance target: 60 FPS desktop, 30 FPS mid-range mobile minimum.
- Persistence: no history persistence across refresh.
- Additional required feature: live pressure-vs-time graph with drop on failure/release.

## 2. UX and Interaction Contract

## 2.1 Layout (same Lab mental model)
- Top-left panel: controls.
- Top-right panel: computed metrics/status.
- Bottom-left panel: actions.
- Bottom-right panel: graph (replaces decay-chain style history).

## 2.2 Controls (top-left)
- Pump pressure target.
- Valve opening.
- Piston diameter.
- Material selector.
- Unit selector (SI default; practical units optional).

## 2.3 Metrics (top-right)
- Pressure (MPa and bar).
- Force (kN and N).
- Efficiency (%).
- Risk level (Low/Moderate/High/Critical).
- Material stage (Elastic/Yield/Crush/Failed).

## 2.4 Actions (bottom-left)
- Start press.
- Release pressure.
- Emergency stop.
- Reset experiment.

## 2.5 Live graph (bottom-right)
- Plot pressure over time.
- Real-time streaming line chart.
- Upward slope while pressure increases.
- Sharp drop on failure, emergency stop, or pressure release.
- Sliding window (recommended 30 to 60 seconds visible).

## 3. Physics and State Model

## 3.1 Core equation
Use:

F = P * A

Where:
- F: force in N
- P: pressure in Pa
- A: piston area in m^2

Piston area:

A = pi * (d/2)^2

Where d is piston diameter in meters.

## 3.2 Time-based dynamics (simple model)
- Pressure approaches target with first-order response.
- Valve opening affects effective pressure buildup rate.
- Optional damping prevents jitter.

Suggested update form each tick dt:
- dP/dt = (P_target - P_current) * k_ramp * valve_factor - leak_term
- P_current = clamp(P_current + dP/dt * dt, 0, P_max)

## 3.3 Material staged behavior
For each material define reference thresholds:
- Elastic limit
- Yield start
- Crush/failure point

Compute applied stress proxy from force and contact area.
Stage transitions:
- stress < elastic_limit -> Elastic
- elastic_limit <= stress < yield_limit -> Yield (visible permanent deformation starts)
- stress >= crush_limit -> Crush/Failure

Behavior examples:
- Sponge: very low thresholds, early visible deformation.
- Pine wood: medium threshold with non-linear crush onset.
- Aluminum 6061: higher threshold, delayed deformation.
- Ductile iron/tungsten-like high-strength option: may never deform in common operating range.

## 3.4 Risk model (combined)
Risk score combines:
- pressure ratio to safe max
- rate of pressure change (spike risk)
- material margin (distance to yield/crush)
- cavitation proxy (rapid pressure drops / valve states)
- efficiency degradation trend

Output:
- Low: 0-24
- Moderate: 25-49
- High: 50-74
- Critical: 75-100

## 4. Events (mandatory)

- Pressure spike: rapid increase beyond safe ramp.
- Valve slam: abrupt closure causing transient spike.
- Cavitation warning: low-pressure/flow instability conditions.
- Seal leak: gradual pressure loss + efficiency drop.
- Emergency stop trigger: immediate pressure vent sequence.

Each event logs a timestamped entry for the active run only.

## 5. Data Requirements

Store in local dataset (suggested file: static/data/hydraulics_materials.json):
- Material name
- Density (optional v1)
- Elastic/yield/crush thresholds (range + selected nominal)
- Color label
- Human-readable source note

Include citation metadata per material record for transparency.

## 6. AI Assistant Contract

Backend changes in apps/ai_tools/views.py:
- Add SYSTEM_PROMPTS entry for slug hydraulics-lab.
- Add _build_context branch for hydraulics-lab.

Frontend state contract from app.getState():

{
  "experiment": {
    "material": "Aluminum 6061",
    "stage": "Yield",
    "running": true
  },
  "metrics": {
    "pressurePa": 12500000,
    "pressureBar": 125,
    "forceN": 392500,
    "forcekN": 392.5,
    "efficiency": 0.81,
    "riskScore": 62,
    "riskLabel": "High"
  },
  "controls": {
    "targetPressurePa": 15000000,
    "valveOpening": 0.35,
    "pistonDiameterM": 0.2
  },
  "events": [
    {"t": 12.3, "type": "pressure_spike", "note": "Rapid rise detected"}
  ],
  "graph": {
    "windowSec": 45,
    "latestPressurePa": 12500000
  }
}

Assistant behavior:
- Explain current experiment status first.
- Reference live numbers.
- Explain cause-effect (for example valve change -> pressure trend).
- Keep responses concise and educational.

## 7. Mobile-First Requirements

- Base viewport target: 360px width.
- Controls must remain thumb-friendly.
- Graph must remain readable with minimal labels.
- Avoid tiny hover-only interactions.
- Keep main simulation visible above fold with condensed panels.

## 8. Performance Requirements

- Desktop target: >= 60 FPS.
- Mid-range mobile target: >= 30 FPS.
- If FPS drops:
- reduce particle count
- reduce graph point density
- lower post-processing/lighting complexity

## 9. v1 Implementation Checklist

- Create MiniApp seed migration for hydraulics-lab.
- Create templates/miniapps/hydraulics-lab.html.
- Create static/js/miniapps/hydraulics-lab.js.
- Add optional static/data/hydraulics_materials.json.
- Reuse static/css/miniapps.css panel and control classes.
- Integrate VoiceAssistant with appSlug hydraulics-lab.
- Add backend prompt/context branch in apps/ai_tools/views.py.
- Add pressure-time graph panel.
- Ensure no run history persists after refresh.

## 10. Out of Scope for v1

- CFD-accurate fluid simulation.
- Full finite-element material deformation.
- Persistent experiment storage.
- Multiplayer/shared sessions.
