"""Simulation assistant registry.

Each simulation registers a ``SimulationAssistant`` that bundles:
- system prompt
- context builder  (app_state → str)
- fallback handler (message, app_state → str)
- optional slug aliases

New simulations only need to create a module under
``apps/ai_tools/simulations/`` and call ``registry.register()``.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Callable

logger = logging.getLogger(__name__)

DEFAULT_SYSTEM_PROMPT = (
    "You are a friendly science tutor helping a child explore an interactive "
    "simulation. Explain concepts simply and enthusiastically. "
    "Keep answers concise (2-4 sentences) since they will be spoken aloud."
)

DEFAULT_FALLBACK = (
    "That's a great question! Try experimenting with the simulation — "
    "science is all about exploring!"
)


@dataclass
class SimulationAssistant:
    """Configuration bundle for one simulation's AI assistant."""

    slug: str
    system_prompt: str
    build_context: Callable[[dict], str] = lambda state: ""
    fallback: Callable[[str, dict], str] = lambda msg, state: DEFAULT_FALLBACK
    aliases: list[str] = field(default_factory=list)


class _Registry:
    """Singleton registry that maps slugs to SimulationAssistant configs."""

    def __init__(self):
        self._assistants: dict[str, SimulationAssistant] = {}
        self._alias_map: dict[str, str] = {}

    def register(self, assistant: SimulationAssistant):
        self._assistants[assistant.slug] = assistant
        for alias in assistant.aliases:
            self._alias_map[alias] = assistant.slug

    def get(self, slug: str) -> SimulationAssistant:
        canonical = self.resolve_slug(slug)
        return self._assistants.get(canonical, self._default())

    def resolve_slug(self, slug: str) -> str:
        if not slug:
            return "default"
        slug = str(slug).strip().lower()
        return self._alias_map.get(slug, slug)

    def _default(self) -> SimulationAssistant:
        return SimulationAssistant(
            slug="default",
            system_prompt=DEFAULT_SYSTEM_PROMPT,
        )


registry = _Registry()
