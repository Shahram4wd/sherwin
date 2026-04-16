import json
import logging

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_POST

logger = logging.getLogger(__name__)

# System prompts keyed by mini-app slug.
# Add a new entry here whenever a new mini-app is created.
SYSTEM_PROMPTS = {
    "nuclear-decay": (
        "You are a friendly, enthusiastic science tutor helping a child (age 8-12) "
        "explore a radioactive decay simulation.\n\n"
        "The user is interacting with a 3D nucleus builder where they add protons and "
        "neutrons, check stability, and trigger decay modes (alpha, beta-minus, beta-plus, "
        "electron capture, gamma, spontaneous fission, proton emission, neutron emission, "
        "double beta-minus, and cluster decay).\n\n"
        "Guidelines:\n"
        "- Explain in simple, age-appropriate language. Use analogies.\n"
        "- Be encouraging and excited about science.\n"
        "- Reference the current nucleus state provided in the context.\n"
        "- If asked about controls, explain: sliders to add protons/neutrons, "
        "preset buttons at top, decay buttons when nucleus is unstable, "
        "auto-decay checkbox for chain reactions.\n"
        "- Keep answers concise (2-4 sentences) since they will be spoken aloud.\n"
        "- Never invent false physics. Say 'I'm not sure' if uncertain.\n"
    ),
    "hydraulics-lab": (
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
    ),
    "default": (
        "You are a friendly science tutor helping a child explore an interactive "
        "simulation. Explain concepts simply and enthusiastically. "
        "Keep answers concise (2-4 sentences) since they will be spoken aloud."
    ),
}


def _build_context(app_slug, app_state):
    """Build a context string from the mini-app's current state."""
    if app_slug == "nuclear-decay" and app_state:
        z = app_state.get("z", 0)
        n = app_state.get("n", 0)
        a = z + n
        symbol = app_state.get("symbol", "?")
        name = app_state.get("name", "Unknown")
        stability = app_state.get("stability", {})
        history = app_state.get("history", [])
        nz_ratio = app_state.get("nzRatio")
        note = app_state.get("note")
        magic_z = app_state.get("magicZ", False)
        magic_n = app_state.get("magicN", False)
        double_magic = app_state.get("doubleMagic", False)
        even_even = app_state.get("evenEven", False)

        ctx = f"Current nucleus: {name} ({symbol}-{a}), Z={z} protons, N={n} neutrons. "
        if nz_ratio:
            ctx += f"N/Z ratio: {nz_ratio}. "
        if note:
            ctx += f"Special note: {note}. "
        if double_magic:
            ctx += "This is a doubly-magic nucleus (both Z and N are magic numbers) — extra stable! "
        elif magic_z:
            ctx += f"Z={z} is a magic number — this gives extra proton stability. "
        elif magic_n:
            ctx += f"N={n} is a magic number — this gives extra neutron stability. "
        if even_even:
            ctx += "Even-even nucleus (extra stability from nucleon pairing). "
        ctx += f"Stability: {'Stable' if stability.get('stable') else 'Unstable'}. "
        if not stability.get("stable"):
            hl = stability.get("halfLife", 0)
            modes = stability.get("decayModes", [])
            ctx += f"Half-life: {hl}s. Available decay modes: {', '.join(modes)}. "
        if history:
            chain = " → ".join(
                f"{h['from']}→{h['to']}({h['mode']})" for h in history[-5:]
            )
            ctx += f"Recent decay chain: {chain}"
        return ctx
    if app_slug == "hydraulics-lab" and app_state:
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
    return ""


@require_POST
def assistant_chat(request):
    """Handle AI assistant chat requests from any mini-app."""
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    user_message = body.get("message", "").strip()
    if not user_message:
        return JsonResponse({"error": "Empty message"}, status=400)

    app_slug = body.get("app_slug", "default")
    app_state = body.get("app_state", {})
    history = body.get("history", [])

    system_prompt = SYSTEM_PROMPTS.get(app_slug, SYSTEM_PROMPTS["default"])
    context = _build_context(app_slug, app_state)

    # Build messages for the LLM
    llm_messages = [{"role": "system", "content": system_prompt}]
    if context:
        llm_messages.append({"role": "system", "content": f"Current simulation state: {context}"})

    # Add recent conversation history
    for msg in history[-8:]:
        role = msg.get("role", "user")
        if role in ("user", "assistant"):
            llm_messages.append({"role": role, "content": msg.get("content", "")})

    # Ensure the latest user message is included
    if not llm_messages or llm_messages[-1].get("content") != user_message:
        llm_messages.append({"role": "user", "content": user_message})

    # Call the LLM
    api_key = getattr(settings, "OPENAI_API_KEY", "")
    if not api_key:
        return JsonResponse(
            {"reply": _fallback_response(user_message, app_slug, app_state)}
        )

    try:
        import openai

        client = openai.OpenAI(api_key=api_key)
        model = getattr(settings, "OPENAI_MODEL", "gpt-5-mini")
        request_kwargs = {
            "model": model,
            "messages": llm_messages,
        }
        if model.startswith("gpt-5"):
            # gpt-5 models use reasoning tokens and only support default temperature.
            request_kwargs["max_completion_tokens"] = 2000
        else:
            request_kwargs["max_tokens"] = 300
            request_kwargs["temperature"] = 0.7

        response = client.chat.completions.create(**request_kwargs)
        reply = response.choices[0].message.content.strip()
        return JsonResponse({"reply": reply})
    except Exception:
        logger.exception("AI assistant LLM call failed")
        return JsonResponse(
            {"reply": _fallback_response(user_message, app_slug, app_state)}
        )


def _fallback_response(message, app_slug, app_state):
    """Provide a helpful response without an LLM."""
    msg_lower = message.lower()

    if app_slug == "nuclear-decay":
        z = app_state.get("z", 0)
        n = app_state.get("n", 0)
        name = app_state.get("name", "this element")
        stability = app_state.get("stability", {})

        if any(w in msg_lower for w in ("how", "interact", "control", "use", "play")):
            return (
                "Use the sliders on the left to add protons and neutrons. "
                "Try the preset buttons at the top for famous isotopes like Uranium-238! "
                "If the nucleus is unstable, decay buttons will appear — click them to "
                "watch it transform. Turn on Auto-Decay for a chain reaction!"
            )
        if any(w in msg_lower for w in ("stable", "stability", "unstable")):
            if stability.get("stable"):
                return (
                    f"{name} with {z} protons and {n} neutrons is stable! "
                    "That means the strong nuclear force holding it together is "
                    "perfectly balanced. Try adding more neutrons to make it unstable!"
                )
            return (
                f"This nucleus is unstable — it has too many or too few neutrons "
                f"for {z} protons. Nature wants to fix this balance through decay. "
                "Try clicking a decay button to watch it transform!"
            )
        if any(w in msg_lower for w in ("decay", "alpha", "beta", "gamma", "fission", "cluster", "proton em", "neutron em")):
            return (
                "There are many ways a nucleus can decay! "
                "Alpha decay ejects 2 protons + 2 neutrons (a helium nucleus). "
                "Beta decay converts a neutron to a proton (or vice versa). "
                "Gamma decay releases energy as light without changing the nucleus. "
                "Spontaneous fission splits the whole nucleus into two big pieces — boom! "
                "Proton or neutron emission shoots out a single nucleon. "
                "Cluster decay ejects a chunk like Carbon-14. "
                "Double beta decay is super rare — two neutrons convert at once!"
            )
        if any(w in msg_lower for w in ("half-life", "halflife", "half life")):
            return (
                "Half-life is how long it takes for half the atoms in a sample to decay. "
                "Some isotopes have half-lives of billions of years (like Uranium-238), "
                "while others decay in milliseconds! Check the info panel on the right."
            )
        if any(w in msg_lower for w in ("magic", "number")):
            return (
                "Magic numbers (2, 8, 20, 28, 50, 82, 126) are special! "
                "Nuclei with magic numbers of protons or neutrons are extra stable, "
                "like a completed shell. Lead-208 is 'double magic' — both Z=82 and N=126!"
            )

        if any(
            w in msg_lower
            for w in (
                "what is",
                "tell me",
                "about",
                "info",
                "describe",
                "explain",
                "current",
                "this atom",
                "this element",
                "this nucleus",
            )
        ):
            a = z + n
            symbol = app_state.get("symbol", "?")
            nz = app_state.get("nzRatio", "?")
            note = app_state.get("note")
            magic_z = app_state.get("magicZ", False)
            magic_n = app_state.get("magicN", False)
            double_magic = app_state.get("doubleMagic", False)
            reply = (
                f"You're looking at {name} ({symbol}-{a}) — "
                f"that's {z} protons and {n} neutrons with an N/Z ratio of {nz}. "
            )
            if note:
                reply += f"Fun fact: this isotope is also known as {note}. "
            if stability.get("stable"):
                reply += "This nucleus is stable — it won't decay! "
            else:
                modes = stability.get("decayModes", [])
                reply += f"It's unstable and can undergo {', '.join(modes)} decay. "
            if double_magic:
                reply += (
                    "Both its proton and neutron counts are magic numbers, "
                    "making it doubly magic — super stable!"
                )
            elif magic_z:
                reply += f"Its proton count ({z}) is a magic number — that gives it extra stability!"
            elif magic_n:
                reply += f"Its neutron count ({n}) is a magic number — that gives it extra stability!"
            return reply

    if app_slug == "hydraulics-lab":
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
            valve = controls.get("valveOpening", 0) * 100
            diameter = controls.get("pistonDiameterM", 0) * 1000
            return (
                f"You are pressing {material} with a piston about {diameter:.0f} millimeters wide and the valve set to {valve:.0f} percent open. "
                f"The material is in the {stage} stage, and the risk level is {risk}."
            )
        return (
            f"You are running a hydraulics experiment with {material}, and it is currently in the {stage} stage. "
            f"The press is at about {pressure_bar:.1f} bar with a {risk} risk level. Try changing the valve or target pressure and watch how the graph responds."
        )

    return (
        "That's a great question! Try experimenting with the simulation — "
        "add protons and neutrons with the sliders, check stability, "
        "and trigger decays to see what happens. Science is all about exploring!"
    )
