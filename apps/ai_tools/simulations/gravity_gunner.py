"""Gravity Gunner — AI assistant registration."""

from apps.ai_tools.registry import SimulationAssistant, registry

SYSTEM_PROMPT = (
    "You are a fun, enthusiastic space game coach helping a player (age 8-14) "
    "play Gravity Gunner — a top-down space artillery game.\n\n"
    "The player controls a spaceship cannon on the left side of the screen. "
    "They drag anywhere to aim and charge a shot, then release to fire. "
    "Gravity objects (mini planets that pull, repulsor stars that push) bend "
    "the projectile path. Enemies on the right fire back at timed intervals.\n\n"
    "Guidelines:\n"
    "- Start by explaining the player's current shield, score, wave, and how many "
    "enemies are left.\n"
    "- When gravity objects are present, explain in simple terms why shots curve: "
    "planets pull bullets inward, repulsor stars push them away.\n"
    "- Give short tactical tips: 'Try aiming a little higher so the planet curves "
    "your shot down onto the enemy!'\n"
    "- Reference the preset name if it helps (Easy Gravity, Heavy Gravity, Chaos Field).\n"
    "- Keep answers to 2-4 sentences — short enough to be useful mid-game.\n"
    "- Use space and shooting analogies. Never invent game mechanics.\n"
    "- If the player has been hit a lot, offer encouragement and a tip.\n"
)


def build_context(app_state: dict) -> str:
    if not app_state:
        return ""

    primary = app_state.get("primary", {})
    metrics = app_state.get("metrics", {})
    status  = app_state.get("status", {})
    history = app_state.get("history", [])

    player   = primary.get("player", {})
    shield   = player.get("shield", "?")
    angle    = player.get("barrelAngleDeg", 0)
    charge   = player.get("chargePower", 0)
    wave     = primary.get("wave", 1)
    enemies  = primary.get("enemiesAlive", 0)
    grav_obs = primary.get("gravityObjects", [])

    score      = metrics.get("score", 0)
    shots      = metrics.get("shotsFired", 0)
    hits       = metrics.get("hits", 0)
    accuracy   = metrics.get("accuracy", 0)
    incoming   = metrics.get("incomingShots", 0)
    game_label = status.get("label", "Wave active")

    ctx = (
        f"Game status: {game_label}. "
        f"Wave {wave}, shield {shield}/100, score {score}. "
        f"Enemies still alive: {enemies}. "
        f"Barrel angle: {angle}°, charge power: {round(charge * 100)}%. "
        f"Shots fired: {shots}, hits: {hits}, accuracy: {round(accuracy * 100)}%. "
        f"Incoming enemy shots so far: {incoming}. "
    )

    if grav_obs:
        attractor_count = sum(1 for g in grav_obs if g.get("type") == "attractor")
        repulsor_count  = sum(1 for g in grav_obs if g.get("type") == "repulsor")
        parts = []
        if attractor_count:
            parts.append(f"{attractor_count} gravity planet{'s' if attractor_count > 1 else ''} (pull)")
        if repulsor_count:
            parts.append(f"{repulsor_count} repulsor star{'s' if repulsor_count > 1 else ''} (push)")
        ctx += f"Active gravity objects: {', '.join(parts)}. "

    if history:
        ctx += f"Recent events: {'; '.join(history[-3:])}."

    return ctx


def fallback(message: str, app_state: dict) -> str:
    msg_lower = message.lower()
    primary = app_state.get("primary", {})
    metrics = app_state.get("metrics", {})
    player  = primary.get("player", {})
    shield  = player.get("shield", 100)
    score   = metrics.get("score", 0)
    wave    = primary.get("wave", 1)

    if any(w in msg_lower for w in ("how", "play", "control", "aim", "shoot", "drag")):
        return (
            "Drag anywhere on the screen to aim and charge your cannon — "
            "drag left to build power, and move up or down to rotate the barrel. "
            "Release your finger to fire! "
            "Watch how gravity planets and repulsor stars bend your shots."
        )

    if any(w in msg_lower for w in ("gravity", "planet", "curve", "bend", "pull", "push")):
        return (
            "Gravity planets (blue/purple) pull your bullets toward them, "
            "and repulsor stars (orange) push your bullets away. "
            "Try firing slightly off-angle so the planet curves your shot right into the enemy!"
        )

    if any(w in msg_lower for w in ("score", "point", "hit")):
        return (
            f"Your score is {score}. "
            "You earn 100 points for each enemy destroyed, 25 for intercepting enemy bullets, "
            "and 250 for clearing a full wave. You lose 50 points when you're hit."
        )

    if any(w in msg_lower for w in ("shield", "health", "damage", "hurt")):
        return (
            f"Your shield is at {shield} out of 100. "
            "Each enemy hit costs 20 shield points. "
            "Watch the red cooldown ring around enemies — it tells you when they're about to fire!"
        )

    return (
        f"You're on wave {wave} with {shield} shield and {score} points. "
        "Drag to aim and charge your cannon, then release to fire. "
        "Use the gravity fields to curve tricky shots — good luck!"
    )


registry.register(
    SimulationAssistant(
        slug="gravity-gunner",
        system_prompt=SYSTEM_PROMPT,
        build_context=build_context,
        fallback=fallback,
        aliases=["gravitagunner", "gravity_gunner"],
    )
)
