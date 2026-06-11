"""Shared types for chat-completion clients (provider-agnostic).

Both OpenRouter and Gemini speak the OpenAI-compatible chat API and return
results in this shape, so the CrewAI LLM adapter can wrap either one.
"""
from __future__ import annotations

from typing import Protocol, runtime_checkable

from pydantic import BaseModel


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class CompletionResult(BaseModel):
    text: str
    usage: TokenUsage
    model: str


@runtime_checkable
class CompletionClient(Protocol):
    """Any LLM client the CrewAI adapter can drive."""

    async def complete(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = ...,
        temperature: float = ...,
        max_tokens: int | None = ...,
        response_format: dict | None = ...,
    ) -> CompletionResult: ...

    async def aclose(self) -> None: ...
