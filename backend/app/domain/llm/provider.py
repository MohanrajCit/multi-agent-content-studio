"""LLM provider abstraction (req 3, 4, 5).

`build_client` and `build_llm` are the ONLY provider-aware code in the system.
Switching providers is a single setting — LLM_PROVIDER=gemini|openrouter — and
nothing in agents/tasks/crews/flows changes.
"""
from __future__ import annotations

import enum
from typing import Any

from app.core.config import Settings
from app.core.logging import get_logger
from app.domain.llm.crew_llm import CrewCompletionLLM
from app.integrations.gemini_client import GeminiClient
from app.integrations.langfuse_tracer import LangfuseTracer
from app.integrations.openrouter_client import OpenRouterClient
from app.integrations.types import CompletionClient

logger = get_logger("llm_provider")


class LLMProvider(str, enum.Enum):
    GEMINI = "gemini"
    OPENROUTER = "openrouter"


def resolve_provider(settings: Settings) -> LLMProvider:
    return LLMProvider(settings.llm_provider)


def active_model(settings: Settings) -> str:
    """The model id for the currently selected provider."""
    if resolve_provider(settings) is LLMProvider.GEMINI:
        return settings.gemini_model
    return settings.openrouter_model


def build_client(settings: Settings) -> CompletionClient:
    """Construct the chat-completion client for the configured provider."""
    provider = resolve_provider(settings)
    if provider is LLMProvider.GEMINI:
        logger.info("llm_provider_selected", provider="gemini", model=settings.gemini_model)
        return GeminiClient(
            api_key=settings.gemini_api_key.get_secret_value(),
            base_url=settings.gemini_base_url,
            default_model=settings.gemini_model,
        )
    logger.info(
        "llm_provider_selected", provider="openrouter", model=settings.openrouter_model
    )
    return OpenRouterClient(
        api_key=settings.openrouter_api_key.get_secret_value(),
        base_url=settings.openrouter_base_url,
        default_model=settings.openrouter_model,
    )


def build_llm(
    settings: Settings,
    *,
    client: CompletionClient | None = None,
    tracer: LangfuseTracer | None = None,
    agent_name: str = "agent",
    langfuse_trace: Any | None = None,
    temperature: float = 0.7,
) -> CrewCompletionLLM:
    """Build the CrewAI LLM adapter for the active provider (provider-blind output)."""
    provider = resolve_provider(settings)
    client = client or build_client(settings)
    return CrewCompletionLLM(
        client,
        model=active_model(settings),
        provider=provider.value,
        tracer=tracer,
        agent_name=agent_name,
        langfuse_trace=langfuse_trace,
        temperature=temperature,
    )
