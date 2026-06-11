"""Stage persistence port + in-memory implementation.

The flow writes each stage's typed output and emits a status event through this
port after the stage completes. InMemoryStageStore is the default (tests + the
live smoke); the DB-backed adapter (writing to the Phase-3 tables and publishing
SSE events to Redis) is wired in Phase 9 with the repositories.
"""
from __future__ import annotations

from typing import Any, Protocol

from pydantic import BaseModel

from app.core.constants import RunStatus, StageName


class StageEvent(BaseModel):
    stage: StageName
    status: RunStatus
    detail: str | None = None


class StageStore(Protocol):
    def save_stage(self, job_id: str, stage: StageName, payload: BaseModel) -> None: ...
    def emit_event(
        self, job_id: str, stage: StageName, status: RunStatus, detail: str | None = ...
    ) -> None: ...


class InMemoryStageStore:
    """Collects stage outputs and events in memory (no DB)."""

    def __init__(self) -> None:
        self.stages: dict[str, dict[StageName, Any]] = {}
        self.events: list[StageEvent] = []

    def save_stage(self, job_id: str, stage: StageName, payload: BaseModel) -> None:
        self.stages.setdefault(job_id, {})[stage] = payload

    def emit_event(
        self, job_id: str, stage: StageName, status: RunStatus, detail: str | None = None
    ) -> None:
        self.events.append(StageEvent(stage=stage, status=status, detail=detail))

    # convenience for tests/smoke
    def get(self, job_id: str, stage: StageName) -> Any:
        return self.stages.get(job_id, {}).get(stage)

    def event_sequence(self) -> list[tuple[StageName, RunStatus]]:
        return [(e.stage, e.status) for e in self.events]
