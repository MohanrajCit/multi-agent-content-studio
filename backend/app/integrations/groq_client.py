"""Groq client — via the OpenAI-compatible chat endpoint.

Returns generated text together with token usage so callers can record cost
into agent_runs / Langfuse.
"""
from __future__ import annotations

from app.integrations.base import BaseHTTPClient
from app.integrations.types import CompletionResult, TokenUsage

__all__ = ["GroqClient", "CompletionResult", "TokenUsage"]


class GroqClient(BaseHTTPClient):
    service_name = "groq"

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = "https://api.groq.com/openai/v1",
        default_model: str = "llama3-70b-8192",
    ):
        super().__init__(
            base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=120.0,
        )
        self.default_model = default_model

    async def complete(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
        response_format: dict | None = None,
    ) -> CompletionResult:
        body: dict = {
            "model": model or self.default_model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens is not None:
            body["max_tokens"] = max_tokens
        if response_format is not None:
            body["response_format"] = response_format

        data = await self.request_json("POST", "/chat/completions", json=body)
        choice = (data.get("choices") or [{}])[0]
        text = (choice.get("message") or {}).get("content", "") or ""
        usage = data.get("usage", {}) or {}
        return CompletionResult(
            text=text,
            usage=TokenUsage(
                prompt_tokens=usage.get("prompt_tokens", 0),
                completion_tokens=usage.get("completion_tokens", 0),
                total_tokens=usage.get("total_tokens", 0),
            ),
            model=data.get("model", body["model"]),
        )
