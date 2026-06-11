"""Typed application configuration.

All environment access funnels through `Settings`. Importing this module never
reads the environment at import time; call `get_settings()` (cached) instead so
tests can override via dependency injection.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        frozen=True,
    )

    # ── App ──
    app_env: Literal["development", "staging", "production", "test"] = "development"
    app_debug: bool = False
    log_level: str = "INFO"
    log_json: bool = True

    # ── Database ──
    database_url: str = Field(..., description="async SQLAlchemy URL (asyncpg)")
    database_url_sync: str = Field(..., description="sync URL for Alembic")
    db_pool_size: int = 10
    db_max_overflow: int = 20

    # ── Redis ──
    redis_url: str = "redis://localhost:6379/0"

    # ── LLM provider selection ──
    # Switch the entire platform between providers with this one setting.
    llm_provider: Literal["gemini", "openrouter"] = "gemini"

    # ── AI / Search / Extraction ──
    openrouter_api_key: SecretStr = SecretStr("")
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "anthropic/claude-opus-4"

    gemini_api_key: SecretStr = SecretStr("")
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai"
    gemini_model: str = "gemini-2.5-pro"

    serper_api_key: SecretStr = SecretStr("")
    firecrawl_api_key: SecretStr = SecretStr("")

    # ── Langfuse ──
    langfuse_public_key: SecretStr = SecretStr("")
    langfuse_secret_key: SecretStr = SecretStr("")
    langfuse_host: str = "https://cloud.langfuse.com"

    # ── Single-tenant seed ──
    default_user_email: str = "default@studio.local"
    default_user_name: str = "Default User"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def langfuse_enabled(self) -> bool:
        return bool(
            self.langfuse_public_key.get_secret_value()
            and self.langfuse_secret_key.get_secret_value()
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings accessor. Override in tests via dependency_overrides."""
    return Settings()  # type: ignore[call-arg]
