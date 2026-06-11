"""API request/response schemas (DTOs).

These are the wire contracts for the HTTP layer — deliberately separate from the
domain contracts so the public API shape can evolve independently. Mapper helpers
(`to_*`) build them from `JobService` records.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.core.constants import DraftOrigin, JobStatus, RunStatus, StageName
from app.services.job_service import DraftRecord, EventRecord, JobRecord


# ── requests ──────────────────────────────────────────────────────────────
class JobCreateRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=500)
    audience: str = Field(..., min_length=1, max_length=500)
    goal: str = Field(..., min_length=1, max_length=500)
    tone: str = Field(..., min_length=1, max_length=200)
    platform: str = Field(..., min_length=1, max_length=200)


class SectionRegenRequest(BaseModel):
    section_id: str = Field(..., min_length=1)
    instruction: str = Field(..., min_length=1, max_length=2000)


# ── responses ─────────────────────────────────────────────────────────────
class JobOut(BaseModel):
    id: str
    status: JobStatus
    topic: str
    audience: str
    goal: str
    tone: str
    platform: str
    publish_score: float | None = None
    rejection_reason: str | None = None
    current_version: int | None = None
    created_at: datetime


class StageEventOut(BaseModel):
    seq: int
    stage: StageName
    status: RunStatus
    detail: str | None = None
    created_at: datetime


class StatusOut(BaseModel):
    id: str
    status: JobStatus
    publish_score: float | None = None
    rejection_reason: str | None = None
    events: list[StageEventOut]


class DraftSectionOut(BaseModel):
    section_id: str
    heading: str
    content: str
    word_count: int


class DraftSummaryOut(BaseModel):
    version: int
    origin: DraftOrigin
    parent_version: int | None = None
    is_current: bool
    title: str | None = None
    word_count: int
    regen_section_id: str | None = None
    regen_instruction: str | None = None
    created_at: datetime


class DraftDetailOut(DraftSummaryOut):
    meta_description: str = ""
    sections: list[DraftSectionOut]


class ResultsOut(BaseModel):
    id: str
    status: JobStatus
    request_profile: dict[str, Any] | None = None
    research: dict[str, Any] | None = None
    competitor: dict[str, Any] | None = None
    gaps: dict[str, Any] | None = None
    strategy: dict[str, Any] | None = None
    draft: DraftDetailOut | None = None
    evaluation: dict[str, Any] | None = None


# ── mappers ───────────────────────────────────────────────────────────────
def to_job_out(job: JobRecord) -> JobOut:
    current = job.current_draft
    return JobOut(
        id=job.id,
        status=job.status,
        topic=job.topic,
        audience=job.audience,
        goal=job.goal,
        tone=job.tone,
        platform=job.platform,
        publish_score=job.publish_score,
        rejection_reason=job.rejection_reason,
        current_version=current.version if current else None,
        created_at=job.created_at,
    )


def to_status_out(job: JobRecord) -> StatusOut:
    return StatusOut(
        id=job.id,
        status=job.status,
        publish_score=job.publish_score,
        rejection_reason=job.rejection_reason,
        events=[to_event_out(e) for e in job.events],
    )


def to_event_out(event: EventRecord) -> StageEventOut:
    return StageEventOut(
        seq=event.seq,
        stage=event.stage,
        status=event.status,
        detail=event.detail,
        created_at=event.created_at,
    )


def to_draft_summary(draft: DraftRecord) -> DraftSummaryOut:
    return DraftSummaryOut(
        version=draft.version,
        origin=draft.origin,
        parent_version=draft.parent_version,
        is_current=draft.is_current,
        title=draft.article.title,
        word_count=draft.article.word_count,
        regen_section_id=draft.regen_section_id,
        regen_instruction=draft.regen_instruction,
        created_at=draft.created_at,
    )


def to_draft_detail(draft: DraftRecord) -> DraftDetailOut:
    return DraftDetailOut(
        version=draft.version,
        origin=draft.origin,
        parent_version=draft.parent_version,
        is_current=draft.is_current,
        title=draft.article.title,
        word_count=draft.article.word_count,
        regen_section_id=draft.regen_section_id,
        regen_instruction=draft.regen_instruction,
        created_at=draft.created_at,
        meta_description=draft.article.meta_description,
        sections=[
            DraftSectionOut(
                section_id=s.section_id,
                heading=s.heading,
                content=s.content,
                word_count=s.word_count,
            )
            for s in draft.article.sections
        ],
    )


def to_results_out(job: JobRecord) -> ResultsOut:
    def dump(stage: StageName) -> dict[str, Any] | None:
        payload = job.stages.get(stage)
        return payload.model_dump(mode="json") if payload is not None else None

    current = job.current_draft
    return ResultsOut(
        id=job.id,
        status=job.status,
        request_profile=dump(StageName.GUARD),
        research=dump(StageName.RESEARCH),
        competitor=dump(StageName.COMPETITOR),
        gaps=dump(StageName.GAP),
        strategy=dump(StageName.STRATEGY),
        draft=to_draft_detail(current) if current else None,
        evaluation=dump(StageName.EVALUATOR),
    )
