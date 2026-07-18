"""Phase 9 API tests — full HTTP surface over an in-memory JobService.

No DB, no Redis, no LLM: the JobService runs the real flows with a fake runner,
and `get_current_user` is overridden to the single-tenant default. Every endpoint
group is exercised: jobs, status, results, SSE events, draft versions, regen.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_current_user, get_job_service
from app.core.config import Settings
from app.domain.models import (
    CompetitorAnalysis,
    CompetitorProfile,
    ContentGap,
    ContentGapReport,
    ContentStrategy,
    DimensionScore,
    DraftArticle,
    DraftSection,
    EvaluationReport,
    OutlineSection,
    RequestProfile,
    ResearchReport,
    SearchTrend,
)
from app.main import create_app
from app.services.job_service import JobService


# ── fakes / builders ────────────────────────────────────────────────────────
def _valid_profile() -> RequestProfile:
    return RequestProfile(
        is_valid=True, topic="t", audience="a", goal="g", tone="to", platform="p"
    )


def _strategy() -> ContentStrategy:
    return ContentStrategy(
        brief="b", search_intent="i", title="T",
        outline=[OutlineSection(section_id="intro", heading="Intro")],
    )


def _evaluation() -> EvaluationReport:
    d = DimensionScore(score=70)
    return EvaluationReport(
        seo=d, readability=d, structure=d, trustworthiness=d, audience_match=d
    )


class FakeRunner:
    """Instant, deterministic pipeline — no LLM. content() branches so a section
    regeneration returns different text than the original pipeline draft."""

    def __init__(self, profile: RequestProfile | None = None) -> None:
        self._profile = profile or _valid_profile()
        self.calls: list[str] = []

    def guard(self, inputs):
        self.calls.append("guard")
        return self._profile

    def research(self, inputs):
        self.calls.append("research")
        return (
            ResearchReport(summary="s", trends=[SearchTrend(term="x")]),
            CompetitorAnalysis(summary="s", competitors=[CompetitorProfile(url="u")]),
        )

    def strategy(self, inputs, upstream):
        self.calls.append("strategy")
        return (
            ContentGapReport(
                summary="s", missing_topics=[ContentGap(topic="m", opportunity="o")]
            ),
            _strategy(),
        )

    def content(self, inputs, upstream):
        self.calls.append("content")
        if "instruction" in inputs:  # section-regen rewrite
            return DraftArticle(
                title="T",
                sections=[
                    DraftSection(
                        section_id="intro", heading="Intro",
                        content="brand new intro text",
                    )
                ],
            )
        return DraftArticle(
            title="T",
            sections=[
                DraftSection(section_id="intro", heading="Intro", content="old intro"),
                DraftSection(section_id="body", heading="Body", content="body stays"),
            ],
        )

    def quality(self, inputs, upstream):
        self.calls.append("quality")
        return _evaluation()


class _FakeUser:
    id = "00000000-0000-0000-0000-000000000001"


def _build_app(service: JobService):
    app = create_app(settings=Settings(_env_file=None))  # type: ignore[call-arg]
    app.dependency_overrides[get_job_service] = lambda: service
    app.dependency_overrides[get_current_user] = lambda: _FakeUser()
    return app


@asynccontextmanager
async def _client_for(service: JobService):
    app = _build_app(service)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


_BODY = {
    "topic": "ai", "audience": "founders", "goal": "educate",
    "tone": "pro", "platform": "blog",
}


@pytest.fixture
def service() -> JobService:
    return JobService(FakeRunner(), is_test=True)


@pytest.fixture
async def client(service):
    async with _client_for(service) as c:
        yield c


async def _create(client) -> str:
    resp = await client.post("/jobs", json=_BODY)
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


# ── job endpoints ───────────────────────────────────────────────────────────
async def test_create_job_runs_pipeline_to_done(client):
    resp = await client.post("/jobs", json=_BODY)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "DONE"
    assert body["publish_score"] == 70.0
    assert body["current_version"] == 1
    assert body["topic"] == "ai"


async def test_list_and_get_job(client):
    job_id = await _create(client)
    listed = await client.get("/jobs")
    assert listed.status_code == 200
    assert any(j["id"] == job_id for j in listed.json())

    single = await client.get(f"/jobs/{job_id}")
    assert single.status_code == 200
    assert single.json()["id"] == job_id


async def test_create_job_validation_error(client):
    resp = await client.post("/jobs", json={**_BODY, "topic": ""})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "validation_failed"


# ── status endpoint ─────────────────────────────────────────────────────────
async def test_status_reports_stage_events(client):
    job_id = await _create(client)
    resp = await client.get(f"/jobs/{job_id}/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "DONE"
    pairs = [(e["stage"], e["status"]) for e in data["events"]]
    assert pairs[0] == ("GUARD", "RUNNING")
    assert ("EVALUATOR", "COMPLETED") in pairs


async def test_unknown_job_returns_404(client):
    resp = await client.get("/jobs/does-not-exist/status")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


# ── results endpoint ────────────────────────────────────────────────────────
async def test_results_returns_all_contracts(client):
    job_id = await _create(client)
    resp = await client.get(f"/jobs/{job_id}/results")
    assert resp.status_code == 200
    data = resp.json()
    assert data["research"]["summary"] == "s"
    assert data["strategy"]["title"] == "T"
    assert data["evaluation"]["publish_readiness"] == 70.0
    assert data["draft"]["version"] == 1
    assert {s["section_id"] for s in data["draft"]["sections"]} == {"intro", "body"}


# ── SSE streaming endpoint ──────────────────────────────────────────────────
async def test_sse_streams_stage_events_then_done(client):
    job_id = await _create(client)
    resp = await client.get(f"/jobs/{job_id}/events")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")
    text = resp.text
    assert "event: stage" in text
    assert "EVALUATOR" in text
    assert "event: done" in text
    assert '"status": "DONE"' in text


# ── draft version endpoints ─────────────────────────────────────────────────
async def test_list_and_get_draft_version(client):
    job_id = await _create(client)
    drafts = await client.get(f"/jobs/{job_id}/drafts")
    assert drafts.status_code == 200
    assert len(drafts.json()) == 1
    v1 = drafts.json()[0]
    assert v1["version"] == 1
    assert v1["is_current"] is True
    assert v1["origin"] == "PIPELINE"

    detail = await client.get(f"/jobs/{job_id}/drafts/1")
    assert detail.status_code == 200
    assert detail.json()["sections"][0]["section_id"] == "intro"


async def test_get_unknown_draft_version_404(client):
    job_id = await _create(client)
    resp = await client.get(f"/jobs/{job_id}/drafts/99")
    assert resp.status_code == 404


# ── section regeneration endpoint ───────────────────────────────────────────
async def test_regenerate_section_creates_new_version(client):
    job_id = await _create(client)
    resp = await client.post(
        f"/jobs/{job_id}/drafts/1/regenerate-section",
        json={"section_id": "intro", "instruction": "make it punchier"},
    )
    assert resp.status_code == 201, resp.text
    v2 = resp.json()
    assert v2["version"] == 2
    assert v2["origin"] == "SECTION_REGEN"
    assert v2["parent_version"] == 1
    intro = next(s for s in v2["sections"] if s["section_id"] == "intro")
    body = next(s for s in v2["sections"] if s["section_id"] == "body")
    assert intro["content"] == "brand new intro text"  # swapped
    assert body["content"] == "body stays"             # untouched

    drafts = await client.get(f"/jobs/{job_id}/drafts")
    versions = {d["version"]: d["is_current"] for d in drafts.json()}
    assert versions == {1: False, 2: True}


async def test_regenerate_unknown_section_422(client):
    job_id = await _create(client)
    resp = await client.post(
        f"/jobs/{job_id}/drafts/1/regenerate-section",
        json={"section_id": "nope", "instruction": "x"},
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "validation_failed"


async def test_restore_version_appends_copy_as_current(client):
    job_id = await _create(client)
    # v2 via regen, then restore v1 -> v3 (current, copy of v1)
    await client.post(
        f"/jobs/{job_id}/drafts/1/regenerate-section",
        json={"section_id": "intro", "instruction": "punchier"},
    )
    resp = await client.post(f"/jobs/{job_id}/drafts/1/restore")
    assert resp.status_code == 201, resp.text
    v3 = resp.json()
    assert v3["version"] == 3
    assert v3["origin"] == "MANUAL_EDIT"
    assert v3["parent_version"] == 1
    intro = next(s for s in v3["sections"] if s["section_id"] == "intro")
    assert intro["content"] == "old intro"  # restored v1 content

    drafts = await client.get(f"/jobs/{job_id}/drafts")
    current = [d["version"] for d in drafts.json() if d["is_current"]]
    assert current == [3]


# ── rejection path (separate runner) ────────────────────────────────────────
async def test_invalid_request_is_rejected():
    rejected = RequestProfile(
        is_valid=False, rejection_reason="injection", injection_detected=True,
        topic="", audience="a", goal="g", tone="t", platform="p",
    )
    service = JobService(FakeRunner(profile=rejected), is_test=True)
    async with _client_for(service) as client:
        resp = await client.post("/jobs", json=_BODY)
        assert resp.status_code == 201
        body = resp.json()
        assert body["status"] == "REJECTED"
        assert body["rejection_reason"] == "injection"
        assert body["current_version"] is None

        results = await client.get(f"/jobs/{body['id']}/results")
        assert results.json()["draft"] is None
