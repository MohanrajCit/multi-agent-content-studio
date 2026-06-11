"""Content-job API: creation, status, results, live events, drafts, regeneration.

Routes are thin — they validate input, delegate to `JobService`, and map records
to wire DTOs. All orchestration (running flows, versioning drafts, recording
events) lives in the service layer.
"""
from __future__ import annotations

import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, status
from sse_starlette.sse import EventSourceResponse

from app.api.deps import CurrentUser, JobServiceDep
from app.api.schemas import (
    DraftDetailOut,
    DraftSummaryOut,
    JobCreateRequest,
    JobOut,
    ResultsOut,
    SectionRegenRequest,
    StatusOut,
    to_draft_detail,
    to_draft_summary,
    to_event_out,
    to_job_out,
    to_results_out,
    to_status_out,
)

router = APIRouter(prefix="/jobs", tags=["jobs"])


# ── job endpoints ───────────────────────────────────────────────────────────
@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job(
    body: JobCreateRequest, service: JobServiceDep, user: CurrentUser
) -> JobOut:
    """Create a content job and run the full intelligence pipeline."""
    job = await service.create_job(
        user_id=str(user.id),
        topic=body.topic,
        audience=body.audience,
        goal=body.goal,
        tone=body.tone,
        platform=body.platform,
    )
    return to_job_out(job)


@router.get("", response_model=list[JobOut])
async def list_jobs(service: JobServiceDep, user: CurrentUser) -> list[JobOut]:
    return [to_job_out(j) for j in service.list_jobs()]


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str, service: JobServiceDep, user: CurrentUser) -> JobOut:
    return to_job_out(service.get_job(job_id))


# ── status endpoint ─────────────────────────────────────────────────────────
@router.get("/{job_id}/status", response_model=StatusOut)
async def get_status(job_id: str, service: JobServiceDep, user: CurrentUser) -> StatusOut:
    return to_status_out(service.get_job(job_id))


# ── results endpoint ────────────────────────────────────────────────────────
@router.get("/{job_id}/results", response_model=ResultsOut)
async def get_results(job_id: str, service: JobServiceDep, user: CurrentUser) -> ResultsOut:
    return to_results_out(service.get_job(job_id))


# ── SSE streaming endpoint ──────────────────────────────────────────────────
@router.get("/{job_id}/events")
async def stream_events(
    job_id: str, service: JobServiceDep, user: CurrentUser
) -> EventSourceResponse:
    """Server-Sent Events stream of stage progress.

    Emits one `stage` event per recorded transition (in order), then a terminal
    `done` event carrying the final job status.
    """
    service.get_job(job_id)  # 404 early if unknown, before opening the stream

    async def event_source() -> AsyncIterator[dict]:
        async for event in service.stream_events(job_id):
            yield {
                "event": "stage",
                "id": str(event.seq),
                "data": to_event_out(event).model_dump_json(),
            }
        job = service.get_job(job_id)
        yield {
            "event": "done",
            "data": json.dumps(
                {"id": job.id, "status": job.status.value, "publish_score": job.publish_score}
            ),
        }

    return EventSourceResponse(event_source())


# ── draft version endpoints ─────────────────────────────────────────────────
@router.get("/{job_id}/drafts", response_model=list[DraftSummaryOut])
async def list_drafts(
    job_id: str, service: JobServiceDep, user: CurrentUser
) -> list[DraftSummaryOut]:
    return [to_draft_summary(d) for d in service.list_drafts(job_id)]


@router.get("/{job_id}/drafts/{version}", response_model=DraftDetailOut)
async def get_draft(
    job_id: str, version: int, service: JobServiceDep, user: CurrentUser
) -> DraftDetailOut:
    return to_draft_detail(service.get_draft(job_id, version))


# ── section regeneration endpoint ───────────────────────────────────────────
@router.post(
    "/{job_id}/drafts/{version}/regenerate-section",
    response_model=DraftDetailOut,
    status_code=status.HTTP_201_CREATED,
)
async def regenerate_section(
    job_id: str,
    version: int,
    body: SectionRegenRequest,
    service: JobServiceDep,
    user: CurrentUser,
) -> DraftDetailOut:
    """Rewrite one section of a draft, producing a new draft version."""
    draft = await service.regenerate_section(
        job_id, version, section_id=body.section_id, instruction=body.instruction
    )
    return to_draft_detail(draft)


@router.post(
    "/{job_id}/drafts/{version}/restore",
    response_model=DraftDetailOut,
    status_code=status.HTTP_201_CREATED,
)
async def restore_version(
    job_id: str, version: int, service: JobServiceDep, user: CurrentUser
) -> DraftDetailOut:
    """Restore an earlier draft version as a new current version."""
    draft = await service.restore_version(job_id, version)
    return to_draft_detail(draft)
