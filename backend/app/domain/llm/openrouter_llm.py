"""Back-compat shim. The adapter is now provider-agnostic in crew_llm.py.

OpenRouterLLM remains importable (and behaves identically) so existing wiring
and tests keep working; it is simply CrewCompletionLLM defaulted to the
openrouter provider label.
"""
from __future__ import annotations

from typing import Any

from app.domain.llm.crew_llm import CrewCompletionLLM, _extract_json
from app.integrations.types import CompletionClient

__all__ = ["OpenRouterLLM", "CrewCompletionLLM", "_extract_json"]


class OpenRouterLLM(CrewCompletionLLM):
    def __init__(self, client: CompletionClient, *, model: str, **kwargs: Any) -> None:
        kwargs.setdefault("provider", "openrouter")
        super().__init__(client, model=model, **kwargs)
