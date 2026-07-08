from __future__ import annotations

import app.patch  # Apply compatibility patches first

import os

import pytest

# Minimal env so Settings() validates without a real .env during unit tests.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://t:t@localhost:5432/t")
os.environ.setdefault("DATABASE_URL_SYNC", "postgresql+psycopg://t:t@localhost:5432/t")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("LOG_JSON", "false")


@pytest.fixture
def settings():
    from app.core.config import Settings

    # Isolate unit tests from the local .env: only the conftest-seeded
    # environment above and code defaults apply, never developer-local values.
    return Settings(_env_file=None)  # type: ignore[call-arg]
