"""Fallback client that wraps multiple LLM clients.

Iterates over configured clients. If one fails (e.g. rate limits),
it retries with the next one.
"""
from __future__ import annotations

from app.core.errors import ExternalServiceError
from app.core.logging import get_logger
from app.integrations.types import CompletionClient, CompletionResult

logger = get_logger("fallback_client")


class FallbackClient(CompletionClient):
    """Wraps multiple clients and falls back sequentially on error."""

    def __init__(self, clients: list[CompletionClient]):
        if not clients:
            raise ValueError("FallbackClient requires at least one client")
        self.clients = clients

    async def complete(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
        response_format: dict | None = None,
    ) -> CompletionResult:
        errors = []
        for i, client in enumerate(self.clients):
            try:
                # We do not pass model down, so each client uses its own default_model.
                # E.g. Gemini uses gemini-2.5-pro, Groq uses llama3-70b-8192, OpenRouter uses claude.
                # If we pass model='gemini-2.5-pro' to Groq, it will fail.
                return await client.complete(
                    messages,
                    model=None,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format=response_format,
                )
            except Exception as e:
                client_name = client.__class__.__name__
                logger.warning("llm_fallback_attempt_failed", client=client_name, error=str(e))
                errors.append(f"{client_name}: {e}")
                
        # All clients failed
        logger.error("llm_fallback_exhausted", errors=errors)
        raise ExternalServiceError("All LLM fallback clients failed", details=errors)

    async def aclose(self) -> None:
        for client in self.clients:
            await client.aclose()
