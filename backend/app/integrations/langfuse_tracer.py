"""Langfuse observability wrapper.

Degrades to a no-op when keys are not configured, so tests and offline runs
never break. Provides nested trace -> span -> generation primitives that the
Flow/crews use to attribute latency, tokens, and cost.
"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Any

from app.core.config import Settings
from app.core.logging import get_logger

logger = get_logger("langfuse")


class _NoopSpan:
    def update(self, **_: Any) -> None: ...
    def end(self, **_: Any) -> None: ...

    @property
    def id(self) -> str | None:
        return None


class LangfuseTracer:
    def __init__(self, settings: Settings):
        self._enabled = settings.langfuse_enabled
        self._client = None
        if self._enabled:
            try:
                from langfuse import Langfuse

                self._client = Langfuse(
                    public_key=settings.langfuse_public_key.get_secret_value(),
                    secret_key=settings.langfuse_secret_key.get_secret_value(),
                    host=settings.langfuse_host,
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("langfuse_init_failed", error=str(exc))
                self._enabled = False

    @property
    def enabled(self) -> bool:
        return self._enabled

    def trace(self, name: str, **kwargs: Any):
        if not self._enabled or self._client is None:
            return _NoopSpan()
        return self._client.trace(name=name, **kwargs)

    @contextmanager
    def span(self, trace, name: str, **kwargs: Any):
        """Context-managed span; yields a no-op when disabled."""
        if not self._enabled or trace is None or isinstance(trace, _NoopSpan):
            yield _NoopSpan()
            return
        span = trace.span(name=name, **kwargs)
        try:
            yield span
        finally:
            span.end()

    def flush(self) -> None:
        if self._enabled and self._client is not None:
            try:
                self._client.flush()
            except Exception as exc:  # noqa: BLE001
                logger.warning("langfuse_flush_failed", error=str(exc))
