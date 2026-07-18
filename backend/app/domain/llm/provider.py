"""LLM provider abstraction (req 3, 4, 5).

`build_client` and `build_llm` are the ONLY provider-aware code in the system.
Switching providers is a single setting — LLM_PROVIDER=gemini|openrouter|groq — and
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
from app.integrations.groq_client import GroqClient
from app.integrations.fallback_client import FallbackClient
from app.integrations.types import CompletionClient

logger = get_logger("llm_provider")


class LLMProvider(str, enum.Enum):
    GEMINI = "gemini"
    OPENROUTER = "openrouter"
    GROQ = "groq"


def resolve_provider(settings: Settings) -> LLMProvider:
    return LLMProvider(settings.llm_provider)


def active_model(settings: Settings) -> str:
    """The model id for the currently selected provider."""
    provider = resolve_provider(settings)
    if provider is LLMProvider.GEMINI:
        return settings.gemini_model
    if provider is LLMProvider.GROQ:
        return settings.groq_model
    return settings.openrouter_model


def build_client(settings: Settings) -> CompletionClient:
    """Construct the chat-completion client for the configured provider, with automatic fallback."""
    provider = resolve_provider(settings)
    clients: list[CompletionClient] = []
    
    # 1. Primary Provider
    if provider is LLMProvider.GEMINI and settings.gemini_api_key.get_secret_value():
        clients.append(GeminiClient(
            api_key=settings.gemini_api_key.get_secret_value(),
            base_url=settings.gemini_base_url,
            default_model=settings.gemini_model,
        ))
    elif provider is LLMProvider.OPENROUTER and settings.openrouter_api_key.get_secret_value():
        clients.append(OpenRouterClient(
            api_key=settings.openrouter_api_key.get_secret_value(),
            base_url=settings.openrouter_base_url,
            default_model=settings.openrouter_model,
        ))
    elif provider is LLMProvider.GROQ and settings.groq_api_key.get_secret_value():
        clients.append(GroqClient(
            api_key=settings.groq_api_key.get_secret_value(),
            base_url=settings.groq_base_url,
            default_model=settings.groq_model,
        ))

    # 2. Fallback Providers
    if provider is not LLMProvider.OPENROUTER and settings.openrouter_api_key.get_secret_value():
        clients.append(OpenRouterClient(
            api_key=settings.openrouter_api_key.get_secret_value(),
            base_url=settings.openrouter_base_url,
            default_model=settings.openrouter_model,
        ))
        
    if provider is not LLMProvider.GROQ and settings.groq_api_key.get_secret_value():
        clients.append(GroqClient(
            api_key=settings.groq_api_key.get_secret_value(),
            base_url=settings.groq_base_url,
            default_model=settings.groq_model,
        ))
        
    if provider is not LLMProvider.GEMINI and settings.gemini_api_key.get_secret_value():
        clients.append(GeminiClient(
            api_key=settings.gemini_api_key.get_secret_value(),
            base_url=settings.gemini_base_url,
            default_model=settings.gemini_model,
        ))
        
    if not clients:
        raise ValueError("No LLM API keys configured for any provider.")

    logger.info("llm_providers_configured", primary=provider.value, num_fallbacks=len(clients)-1)

    if len(clients) == 1:
        return clients[0]
        
    return FallbackClient(clients)


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
