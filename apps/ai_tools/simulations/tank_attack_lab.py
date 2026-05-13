"""Tank Attack Lab simulation - AI assistant registration."""

from apps.ai_tools.registry import SimulationAssistant, registry

SYSTEM_PROMPT = (
    "You are a concise battlefield tutor helping a player understand Tank Attack Lab. "
    "This is a stationary artillery simulation where the turret rotates, domes fire back, and the player picks shell type, heading, and elevation. "
    "Focus on tank specifications, shell behavior, and practical firing guidance.\n\n"
    "Guidelines:\n"
    "- Keep answers short: 2-4 sentences.\n"
    "- If asked about tanks, compare range, caliber, reload, and accuracy tradeoffs.\n"
    "- If asked about shells, explain AP vs HE vs Fragmentation and ideal targets.\n"
    "- Mention current selected tank and current target context when available.\n"
    "- Do not invent unsupported tanks or ammunition.\n"
)


def build_context(app_state: dict) -> str:
    if not app_state:
        return ""

    primary = app_state.get("primary", {})
    metrics = app_state.get("metrics", {})
    controls = primary.get("controls", {})
    tank = primary.get("selectedTank", {})
    target = primary.get("selectedTarget")

    tank_name = tank.get("name", "Unknown tank")
    caliber = tank.get("caliberMm")
    max_range = tank.get("maxRangeM")
    reload = tank.get("reloadSec")
    velocity = tank.get("muzzleVelocity")
    dispersion = tank.get("dispersionM")

    score = metrics.get("score")
    health = metrics.get("tankHealth")
    shots = metrics.get("shotsFired")
    hits = metrics.get("hits")
    accuracy = metrics.get("accuracy")

    shell = primary.get("selectedShell")
    heading = controls.get("headingDeg")
    elevation = controls.get("elevationDeg")
    ranged = controls.get("rangefinderMeters")

    ctx = (
        f"Selected tank: {tank_name}. "
        f"Caliber: {caliber} mm. "
        f"Max range: {max_range} m. "
        f"Reload: {reload} s. "
        f"Muzzle velocity: {velocity} m/s. "
        f"Dispersion estimate: {dispersion} m. "
        f"Current shell: {shell}. "
        f"Heading: {heading} deg. Elevation: {elevation} deg. "
    )

    if ranged is not None:
        ctx += f"Rangefinder reading: {ranged:.1f} m. "

    if target:
        ctx += (
            f"Selected target: {target.get('label', 'Target')} "
            f"at {target.get('distanceM', '?')} m and heading {target.get('headingDeg', '?')} deg, "
            f"HP {target.get('hp', '?')}. "
        )

    if score is not None:
        ctx += (
            f"Score: {score}. "
            f"Tank health: {health}. "
            f"Shots fired: {shots}. Hits: {hits}. Accuracy: {accuracy}."
        )

    return ctx


def fallback(message: str, app_state: dict) -> str:
    msg = message.lower()
    primary = app_state.get("primary", {})
    tank = primary.get("selectedTank", {})
    shell = primary.get("selectedShell", "AP")

    tank_name = tank.get("name", "your selected tank")
    caliber = tank.get("caliberMm", "?")
    max_range = tank.get("maxRangeM", "?")
    reload = tank.get("reloadSec", "?")

    if any(word in msg for word in ("tank", "spec", "compare", "range", "reload", "caliber")):
        return (
            f"{tank_name} currently gives you a {caliber} mm gun with about {max_range} meters max range and {reload} second reload. "
            "Use higher velocity guns for easier long-range corrections, while heavier guns can deliver stronger single-hit damage but often reload slower."
        )

    if any(word in msg for word in ("ammo", "shell", "ap", "he", "frag", "fragment")):
        return (
            "AP works best on armored domes, HE is best on large domes, and Fragmentation is best against mini dome clusters. "
            "Wrong shell choices still deal damage, but with a heavy penalty, so matching shell type improves consistency."
        )

    if any(word in msg for word in ("aim", "elevation", "heading", "rangefinder", "fire")):
        return (
            f"Use the rangefinder when possible, then tune elevation first and heading second before firing {shell}. "
            "If you skip rangefinding, you can still eyeball both values, but expect wider miss distance from dispersion and angle error."
        )

    return (
        f"You are currently using {tank_name}. Ask about tank specs or shell behavior and I can give quick firing guidance for this setup."
    )


registry.register(
    SimulationAssistant(
        slug="tank-attack-lab",
        system_prompt=SYSTEM_PROMPT,
        build_context=build_context,
        fallback=fallback,
        aliases=["tank_attack_lab", "tank-attack", "tank-lab"],
    )
)
