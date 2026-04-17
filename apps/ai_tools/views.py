import json
import logging

from django.http import JsonResponse
from django.views.decorators.http import require_POST

from apps.ai_tools.client import OpenAIClient
from apps.ai_tools.registry import registry

# Import simulation modules so they self-register on startup.
import apps.ai_tools.simulations.nuclear_decay  # noqa: F401
import apps.ai_tools.simulations.hydraulics_lab  # noqa: F401

logger = logging.getLogger(__name__)


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

    app_slug = registry.resolve_slug(body.get("app_slug", "default"))
    app_state = body.get("app_state", {})
    history = body.get("history", [])

    sim = registry.get(app_slug)
    context = sim.build_context(app_state)

    # Build messages for the LLM
    llm_messages = [{"role": "system", "content": sim.system_prompt}]
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
    client = OpenAIClient()
    if not client.available:
        logger.warning("OpenAI API key not configured — using fallback response")
        return JsonResponse({"reply": sim.fallback(user_message, app_state)})

    try:
        reply = client.chat(llm_messages)
        return JsonResponse({"reply": reply})
    except Exception:
        logger.exception("AI assistant LLM call failed")
        return JsonResponse({"reply": sim.fallback(user_message, app_state)})
