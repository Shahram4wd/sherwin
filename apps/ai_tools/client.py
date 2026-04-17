import logging

from django.conf import settings

logger = logging.getLogger(__name__)


class OpenAIClient:
    """Thin wrapper around the OpenAI ChatCompletion API.

    Centralises model selection, token limits, and error handling so
    every simulation assistant uses the same call path.
    """

    def __init__(self):
        self.api_key = getattr(settings, "OPENAI_API_KEY", "")
        self.model = getattr(settings, "OPENAI_MODEL", "gpt-5-mini")

    @property
    def available(self):
        return bool(self.api_key)

    def chat(self, messages, *, max_tokens=300, temperature=0.7):
        """Send a chat completion request and return the reply string.

        Raises on failure so the caller can fall back gracefully.
        """
        import openai

        client = openai.OpenAI(api_key=self.api_key)

        kwargs = {
            "model": self.model,
            "messages": messages,
        }

        if self.model.startswith("gpt-5"):
            kwargs["max_completion_tokens"] = max(max_tokens, 2000)
        else:
            kwargs["max_tokens"] = max_tokens
            kwargs["temperature"] = temperature

        response = client.chat.completions.create(**kwargs)
        return response.choices[0].message.content.strip()
