"""Test doubles: a FakeLLM that returns canned responses (no network, req 7)."""
from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel

try:
    from crewai.llms.base_llm import BaseLLM
except Exception:  # pragma: no cover
    BaseLLM = object  # type: ignore[assignment,misc]


class FakeLLM(BaseLLM):  # type: ignore[misc]
    """Returns a scripted response; parses to response_model when requested."""

    def __init__(self, response: dict | str, *, model: str = "fake/model") -> None:
        try:
            super().__init__(model=model)
        except Exception:
            self.model = model  # type: ignore[attr-defined]
        object.__setattr__(self, "_response", response)
        object.__setattr__(self, "calls", [])

    def call(  # type: ignore[override]
        self,
        messages: Any,
        tools: Any = None,
        callbacks: Any = None,
        available_functions: Any = None,
        from_task: Any = None,
        from_agent: Any = None,
        response_model: type[BaseModel] | None = None,
    ) -> str | Any:
        object.__getattribute__(self, "calls").append(messages)
        resp = object.__getattribute__(self, "_response")
        if response_model is not None and isinstance(resp, dict):
            return response_model.model_validate(resp)
        return resp if isinstance(resp, str) else json.dumps(resp)

    def supports_function_calling(self) -> bool:
        return False
