"""Hydraulics Lab simulation — AI assistant registration."""

from apps.ai_tools.registry import SimulationAssistant, registry

SYSTEM_PROMPT = (
    "You are a friendly, enthusiastic science tutor helping a child (age 8-12) "
    "explore a hydraulics simulation.\n\n"
    "The user is controlling a hydraulic press with pump pressure, valve opening, piston size, "
    "material choice, and safety actions. The simulation shows force, pressure, efficiency, risk, "
    "material deformation stages, and a live pressure-vs-time graph.\n\n"
    "Guidelines:\n"
    "- Explain in simple, age-appropriate language. Use analogies from water, squeezing, and pushing.\n"
    "- Reference the current experiment state provided in the context.\n"
    "- If asked about controls, explain: top-left controls tune pressure, valve, piston, material, and units; "
    "top-right shows live metrics; bottom-left triggers actions; bottom-right shows the live graph.\n"
    "- Explain cause and effect clearly, especially why pressure rises, drops, or causes failure.\n"
    "- Keep answers concise (2-4 sentences) since they may be spoken aloud.\n"
    "- Never invent engineering facts. Say 'I'm not sure' if uncertain.\n"
)


def build_context(app_state: dict) -> str:
    if not app_state:
        return ""

    experiment = app_state.get("experiment", {})
    metrics = app_state.get("metrics", {})
    controls = app_state.get("controls", {})
    events = app_state.get("events", [])

    material = experiment.get("material", "Unknown material")
    stage = experiment.get("stage", "Unknown")
    running = experiment.get("running", False)
    pressure_bar = metrics.get("pressureBar")
    pressure_mpa = metrics.get("pressureMpa")
    force_kn = metrics.get("forcekN")
    efficiency = metrics.get("efficiency")
    risk_label = metrics.get("riskLabel")
    target_pa = controls.get("targetPressurePa")
    valve = controls.get("valveOpening")
    diameter_m = controls.get("pistonDiameterM")

    ctx = f"Current experiment: material {material}. Stage: {stage}. "
    ctx += f"The press is {'running' if running else 'idle'}. "
    if pressure_bar is not None and pressure_mpa is not None:
        ctx += f"Pressure: {pressure_bar:.1f} bar ({pressure_mpa:.2f} MPa). "
    if force_kn is not None:
        ctx += f"Force: {force_kn:.1f} kN. "
    if efficiency is not None:
        ctx += f"Efficiency: {efficiency * 100:.0f} percent. "
    if risk_label:
        ctx += f"Risk level: {risk_label}. "
    if target_pa is not None:
        ctx += f"Target pressure: {target_pa / 100000:.1f} bar. "
    if valve is not None:
        ctx += f"Valve opening: {valve * 100:.0f} percent. "
    if diameter_m is not None:
        ctx += f"Piston diameter: {diameter_m * 1000:.0f} mm. "
    if events:
        latest = events[-1]
        ctx += f"Latest event: {latest.get('note', 'None')} at {latest.get('t', '?')} seconds."
    return ctx


def fallback(message: str, app_state: dict) -> str:
    msg_lower = message.lower()
    experiment = app_state.get("experiment", {})
    metrics = app_state.get("metrics", {})
    controls = app_state.get("controls", {})
    material = experiment.get("material", "this material")
    stage = experiment.get("stage", "Elastic")
    pressure_bar = metrics.get("pressureBar", 0)
    force_kn = metrics.get("forcekN", 0)
    risk = metrics.get("riskLabel", "Low")

    if any(w in msg_lower for w in ("how", "interact", "control", "use", "play")):
        return (
            "Use the controls on the left to set pump pressure, valve opening, piston size, and material. "
            "The panel on the right shows live pressure, force, efficiency, and risk. "
            "Use the action buttons to start, release pressure, or trigger an emergency stop, and watch the graph at the bottom right."
        )
    if any(w in msg_lower for w in ("pressure", "force", "graph")):
        return (
            f"Right now the press is at about {pressure_bar:.1f} bar and pushing with about {force_kn:.1f} kilonewtons. "
            "The graph shows how pressure changes over time, so when the system releases or something fails, the line should drop sharply."
        )
    if any(w in msg_lower for w in ("risk", "safe", "danger", "failure")):
        return (
            f"The current risk level is {risk}. "
            f"Your material is in the {stage} stage, which tells you whether it is still springy, starting to bend permanently, or being crushed."
        )
    if any(w in msg_lower for w in ("what is", "tell me", "about", "current", "experiment", "material")):
        valve_pct = controls.get("valveOpening", 0) * 100
        diameter = controls.get("pistonDiameterM", 0) * 1000
        return (
            f"You are pressing {material} with a piston about {diameter:.0f} millimeters wide and the valve set to {valve_pct:.0f} percent open. "
            f"The material is in the {stage} stage, and the risk level is {risk}."
        )
    return (
        f"You are running a hydraulics experiment with {material}, and it is currently in the {stage} stage. "
        f"The press is at about {pressure_bar:.1f} bar with a {risk} risk level. Try changing the valve or target pressure and watch how the graph responds."
    )


registry.register(
    SimulationAssistant(
        slug="hydraulics-lab",
        system_prompt=SYSTEM_PROMPT,
        build_context=build_context,
        fallback=fallback,
        aliases=["hydraulics", "hydraulics_lab", "hydraulic-press"],
    )
)
