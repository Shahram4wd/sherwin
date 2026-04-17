"""Nuclear Decay simulation — AI assistant registration."""

from apps.ai_tools.registry import SimulationAssistant, registry

SYSTEM_PROMPT = (
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
)


def build_context(app_state: dict) -> str:
    if not app_state:
        return ""

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


def fallback(message: str, app_state: dict) -> str:
    msg_lower = message.lower()
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
            "what is", "tell me", "about", "info", "describe", "explain",
            "current", "this atom", "this element", "this nucleus",
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

    return (
        "That's a great question! Try experimenting with the simulation — "
        "add protons and neutrons with the sliders, check stability, "
        "and trigger decays to see what happens. Science is all about exploring!"
    )


registry.register(
    SimulationAssistant(
        slug="nuclear-decay",
        system_prompt=SYSTEM_PROMPT,
        build_context=build_context,
        fallback=fallback,
        aliases=["nuclear_decay", "nucleardecay"],
    )
)
