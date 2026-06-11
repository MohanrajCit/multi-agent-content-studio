"""Provider-abstraction tests (req 8) — init + selection, no network."""
from __future__ import annotations

import pytest

from app.core.config import Settings
from app.domain.llm.provider import (
    LLMProvider,
    active_model,
    build_client,
    build_llm,
    resolve_provider,
)
from app.integrations.gemini_client import GeminiClient
from app.integrations.openrouter_client import OpenRouterClient

BASE_ENV = dict(
    database_url="postgresql+asyncpg://t:t@localhost:5432/t",
    database_url_sync="postgresql+psycopg://t:t@localhost:5432/t",
    redis_url="redis://localhost:6379/0",
    openrouter_api_key="or-key",
    gemini_api_key="gm-key",
)


def _settings(**overrides) -> Settings:
    # _env_file=None isolates the test from the local .env so only BASE_ENV,
    # explicit overrides, and code defaults take effect.
    return Settings(_env_file=None, **{**BASE_ENV, **overrides})  # type: ignore[arg-type]


def test_default_provider_is_gemini():
    # req 6: default to Gemini for development
    s = _settings()
    assert resolve_provider(s) is LLMProvider.GEMINI


def test_gemini_provider_initialization():
    s = _settings(llm_provider="gemini", gemini_model="gemini-2.5-pro")
    client = build_client(s)
    assert isinstance(client, GeminiClient)
    assert client.default_model == "gemini-2.5-pro"
    assert active_model(s) == "gemini-2.5-pro"


def test_openrouter_provider_initialization():
    s = _settings(llm_provider="openrouter", openrouter_model="anthropic/claude-opus-4")
    client = build_client(s)
    assert isinstance(client, OpenRouterClient)
    assert client.default_model == "anthropic/claude-opus-4"
    assert active_model(s) == "anthropic/claude-opus-4"


def test_provider_selection_through_settings():
    # req 5: switching is a single setting; adapter stays the same opaque type.
    gem_llm = build_llm(_settings(llm_provider="gemini"))
    or_llm = build_llm(_settings(llm_provider="openrouter"))

    assert gem_llm.provider_name == "gemini"
    assert gem_llm.model == "gemini-2.5-pro"
    assert or_llm.provider_name == "openrouter"
    assert or_llm.model == "anthropic/claude-opus-4"
    # Both expose the identical CrewAI BaseLLM interface (provider-blind downstream).
    assert type(gem_llm) is type(or_llm)


def test_invalid_provider_rejected():
    with pytest.raises(Exception):
        _settings(llm_provider="bogus")
