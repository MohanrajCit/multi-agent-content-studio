"""JobService — in-memory orchestrator for the content pipeline.

It owns the user-facing use cases the API exposes:

  * create_job          → run the full ContentIntelligenceFlow, persist results
  * get_job / status    → current job state + ordered stage events
  * results             → the typed stage contracts for a completed job
  * drafts / draft      → versioned draft history (immutable versions)
  * regenerate_section  → run SectionRegenerationFlow, append a new draft version
  * stream_events       → async replay of stage events (drives the SSE endpoint)

The service doubles as the flow's `StageStore`: flows call `save_stage` /
`emit_event` keyed by job_id, and the service routes each call into the right
`JobRecord`. It depends only on the `PipelineRunner` port, so tests inject a fake
runner and exercise every endpoint with zero LLM/DB calls.

State lives in memory (single process). The DB/Redis-backed adapter is a drop-in
replacement implementing the same surface; nothing in the API layer changes.
"""
from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from datetime import datetime, timezone

import asyncio
from typing import Any
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.core.constants import DraftOrigin, JobStatus, RunStatus, StageName
from app.core.errors import NotFoundError, ValidationFailedError
from app.core.logging import get_logger
from app.domain.flows import (
    ContentIntelligenceFlow,
    PipelineRunner,
    SectionRegenerationFlow,
)
from app.domain.models import DraftArticle

logger = get_logger("job_service")

# Statuses past which a job no longer advances on stage events.
_TERMINAL: frozenset[JobStatus] = frozenset(
    {JobStatus.DONE, JobStatus.REJECTED, JobStatus.FAILED}
)

# Which coarse job status a RUNNING stage event maps to (for live progress).
_STAGE_TO_STATUS: dict[StageName, JobStatus] = {
    StageName.GUARD: JobStatus.VALIDATING,
    StageName.RESEARCH: JobStatus.RESEARCHING,
    StageName.COMPETITOR: JobStatus.RESEARCHING,
    StageName.GAP: JobStatus.STRATEGIZING,
    StageName.STRATEGY: JobStatus.STRATEGIZING,
    StageName.WRITER: JobStatus.WRITING,
    StageName.EVALUATOR: JobStatus.EVALUATING,
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class EventRecord:
    """A single stage status transition, ordered by a per-job sequence number."""

    stage: StageName
    status: RunStatus
    detail: str | None
    seq: int
    created_at: datetime = field(default_factory=_now)


@dataclass
class DraftRecord:
    """One immutable draft version. version 1 is the pipeline output; later
    versions come from section regeneration."""

    version: int
    origin: DraftOrigin
    parent_version: int | None
    article: DraftArticle
    is_current: bool
    regen_section_id: str | None = None
    regen_instruction: str | None = None
    created_at: datetime = field(default_factory=_now)


@dataclass
class JobRecord:
    id: str
    user_id: str
    topic: str
    audience: str
    goal: str
    tone: str
    platform: str
    status: JobStatus = JobStatus.QUEUED
    rejection_reason: str | None = None
    publish_score: float | None = None
    stages: dict[StageName, BaseModel] = field(default_factory=dict)
    drafts: list[DraftRecord] = field(default_factory=list)
    events: list[EventRecord] = field(default_factory=list)
    created_at: datetime = field(default_factory=_now)
    _listeners: list[Any] = field(default_factory=list, init=False, repr=False)

    @property
    def current_draft(self) -> DraftRecord | None:
        return next((d for d in self.drafts if d.is_current), None)

    def draft_version(self, version: int) -> DraftRecord | None:
        return next((d for d in self.drafts if d.version == version), None)


class JobService:
    """In-memory pipeline orchestrator + flow StageStore."""

    def __init__(self, runner: PipelineRunner, *, is_test: bool = False) -> None:
        self._runner = runner
        self._jobs: dict[str, JobRecord] = {}
        self._seq = 0
        self.is_test = is_test

    # ── StageStore port (called by flows during kickoff) ──────────────────
    def save_stage(self, job_id: str, stage: StageName, payload: BaseModel) -> None:
        job = self._jobs[job_id]
        job.stages[stage] = payload
        if stage == StageName.EVALUATOR:
            job.publish_score = float(getattr(payload, "publish_readiness", 0.0) or 0.0)

    def emit_event(
        self,
        job_id: str,
        stage: StageName,
        status: RunStatus,
        detail: str | None = None,
    ) -> None:
        job = self._jobs[job_id]
        self._seq += 1
        event = EventRecord(stage=stage, status=status, detail=detail, seq=self._seq)
        job.events.append(event)
        if status is RunStatus.RUNNING and job.status not in _TERMINAL:
            job.status = _STAGE_TO_STATUS.get(stage, job.status)

        for q in job._listeners:
            try:
                q.put_nowait(event)
            except Exception:
                pass

    # ── use cases ─────────────────────────────────────────────────────────
    async def create_job(
        self,
        *,
        user_id: str,
        topic: str,
        audience: str,
        goal: str,
        tone: str,
        platform: str,
    ) -> JobRecord:
        job = JobRecord(
            id=uuid.uuid4().hex,
            user_id=user_id,
            topic=topic,
            audience=audience,
            goal=goal,
            tone=tone,
            platform=platform,
        )
        self._jobs[job.id] = job

        if self.is_test:
            flow = ContentIntelligenceFlow(self._runner, self)
            inputs = {"job_id": job.id, **self._request_inputs(job)}
            try:
                await run_in_threadpool(flow.kickoff, inputs=inputs)
            except Exception as exc:  # noqa: BLE001 — surface as FAILED, never 500 the pipeline
                logger.error("job_failed", job_id=job.id, error=str(exc))
                job.status = JobStatus.FAILED
                job.rejection_reason = f"pipeline error: {exc}"
                return job

            profile = job.stages.get(StageName.GUARD)
            if profile is not None and not getattr(profile, "is_valid", True):
                job.status = JobStatus.REJECTED
                job.rejection_reason = getattr(profile, "rejection_reason", None)
                return job

            article = job.stages.get(StageName.WRITER)
            if isinstance(article, DraftArticle):
                self._append_draft(job, article, origin=DraftOrigin.PIPELINE, parent_version=None)
            job.status = JobStatus.DONE
            logger.info("job_done", job_id=job.id, publish_score=job.publish_score)
        else:
            asyncio.create_task(self._run_pipeline(job))

        return job

    async def _run_pipeline(self, job: JobRecord) -> None:
        flow = ContentIntelligenceFlow(self._runner, self)
        inputs = {"job_id": job.id, **self._request_inputs(job)}
        try:
            await run_in_threadpool(flow.kickoff, inputs=inputs)
        except Exception as exc:  # noqa: BLE001 — surface as FAILED, never 500 the pipeline
            logger.error("job_failed", job_id=job.id, error=str(exc))
            job.status = JobStatus.FAILED
            job.rejection_reason = f"pipeline error: {exc}"
            self._notify_listeners(job)
            return

        profile = job.stages.get(StageName.GUARD)
        if profile is not None and not getattr(profile, "is_valid", True):
            job.status = JobStatus.REJECTED
            job.rejection_reason = getattr(profile, "rejection_reason", None)
            self._notify_listeners(job)
            return

        article = job.stages.get(StageName.WRITER)
        if isinstance(article, DraftArticle):
            self._append_draft(job, article, origin=DraftOrigin.PIPELINE, parent_version=None)
        job.status = JobStatus.DONE
        logger.info("job_done", job_id=job.id, publish_score=job.publish_score)
        self._notify_listeners(job)

    def _notify_listeners(self, job: JobRecord) -> None:
        for q in job._listeners:
            try:
                q.put_nowait(None)
            except Exception:
                pass

    async def regenerate_section(
        self, job_id: str, version: int, *, section_id: str, instruction: str
    ) -> DraftRecord:
        job = self._require_job(job_id)
        base = self._require_draft(job, version)
        if not any(s.section_id == section_id for s in base.article.sections):
            raise ValidationFailedError(
                f"Section '{section_id}' does not exist in draft v{version}.",
                details={"section_id": section_id, "version": version},
            )

        strategy = job.stages.get(StageName.STRATEGY)
        flow = SectionRegenerationFlow(self._runner, self)
        inputs = {
            "job_id": job_id,
            "section_id": section_id,
            "instruction": instruction,
            **self._request_inputs(job),
            "base_draft": base.article.model_dump(),
            "strategy": strategy.model_dump() if strategy is not None else None,
        }
        await run_in_threadpool(flow.kickoff, inputs=inputs)

        new_article = job.stages.get(StageName.WRITER)
        if not isinstance(new_article, DraftArticle):
            raise ValidationFailedError("Regeneration produced no draft.")
        record = self._append_draft(
            job,
            new_article,
            origin=DraftOrigin.SECTION_REGEN,
            parent_version=version,
            section_id=section_id,
            instruction=instruction,
        )
        job.status = JobStatus.DONE
        logger.info(
            "section_regenerated",
            job_id=job_id,
            version=record.version,
            section_id=section_id,
        )
        return record

    async def restore_version(self, job_id: str, version: int) -> DraftRecord:
        """Restore an earlier draft version by appending a copy as the new current
        version (versions are immutable; restoring never mutates history)."""
        job = self._require_job(job_id)
        source = self._require_draft(job, version)
        record = self._append_draft(
            job,
            source.article.model_copy(deep=True),
            origin=DraftOrigin.MANUAL_EDIT,
            parent_version=version,
        )
        job.status = JobStatus.DONE
        logger.info("version_restored", job_id=job_id, restored_from=version, new=record.version)
        return record

    # ── queries ───────────────────────────────────────────────────────────
    def get_job(self, job_id: str) -> JobRecord:
        return self._require_job(job_id)

    def list_jobs(self) -> list[JobRecord]:
        return sorted(self._jobs.values(), key=lambda j: j.created_at, reverse=True)

    def list_drafts(self, job_id: str) -> list[DraftRecord]:
        return list(self._require_job(job_id).drafts)

    def get_draft(self, job_id: str, version: int) -> DraftRecord:
        return self._require_draft(self._require_job(job_id), version)

    async def stream_events(self, job_id: str) -> AsyncIterator[EventRecord]:
        """Replay this job's recorded stage events in order.

        Jobs run to completion synchronously, so by the time a client subscribes
        the full event log is present; the same generator shape backs a future
        live (worker-fed) stream without changing the endpoint.
        """
        job = self._require_job(job_id)
        
        yielded_seqs = set()
        for event in list(job.events):
            yield event
            yielded_seqs.add(event.seq)

        if job.status in _TERMINAL:
            return

        q = asyncio.Queue()
        job._listeners.append(q)

        try:
            while job.status not in _TERMINAL or not q.empty():
                try:
                    event = await asyncio.wait_for(q.get(), timeout=1.0)
                    if event is not None and event.seq not in yielded_seqs:
                        yield event
                        yielded_seqs.add(event.seq)
                except asyncio.TimeoutError:
                    if job.status in _TERMINAL and q.empty():
                        break
        finally:
            if q in job._listeners:
                job._listeners.remove(q)

    # ── internals ─────────────────────────────────────────────────────────
    @staticmethod
    def _request_inputs(job: JobRecord) -> dict[str, str]:
        return {
            "topic": job.topic,
            "audience": job.audience,
            "goal": job.goal,
            "tone": job.tone,
            "platform": job.platform,
        }

    def _append_draft(
        self,
        job: JobRecord,
        article: DraftArticle,
        *,
        origin: DraftOrigin,
        parent_version: int | None,
        section_id: str | None = None,
        instruction: str | None = None,
    ) -> DraftRecord:
        for d in job.drafts:
            d.is_current = False
        version = max((d.version for d in job.drafts), default=0) + 1
        record = DraftRecord(
            version=version,
            origin=origin,
            parent_version=parent_version,
            article=article,
            is_current=True,
            regen_section_id=section_id,
            regen_instruction=instruction,
        )
        job.drafts.append(record)
        return record

    def _require_job(self, job_id: str) -> JobRecord:
        job = self._jobs.get(job_id)
        if job is None:
            raise NotFoundError(f"Job '{job_id}' not found.")
        return job

    @staticmethod
    def _require_draft(job: JobRecord, version: int) -> DraftRecord:
        draft = job.draft_version(version)
        if draft is None:
            raise NotFoundError(f"Draft v{version} not found for job '{job.id}'.")
        return draft
