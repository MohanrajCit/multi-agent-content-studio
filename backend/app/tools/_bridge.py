"""Async→sync bridge shared by CrewAI tool wrappers.

CrewAI tools run synchronously inside agent execution; our integration clients
are async. We reuse a single persistent background event loop (same approach as
the LLM adapter) so tools can call async clients safely.
"""
from __future__ import annotations

from typing import Any

from app.domain.llm.crew_llm import _get_loop_thread


def run_sync(coro) -> Any:
    """Run an awaitable to completion from synchronous tool code."""
    return _get_loop_thread().run(coro)
