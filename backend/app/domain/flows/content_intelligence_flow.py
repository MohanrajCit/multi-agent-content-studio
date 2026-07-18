"""ContentIntelligenceFlow — the full pipeline orchestration.

    @start validate_request (Guard)
        -> @router  valid | invalid
    valid   -> research -> strategy -> content -> quality -> finalize
    invalid -> finalize_rejected   (no paid crews run)

Each stage persists its typed output and emits a status event via the StageStore
port. The flow depends on a PipelineRunner (injected), so it is fully testable
with a fake runner and no LLM calls.
"""
from __future__ import annotations

from typing import Any

from crewai.flow.flow import Flow, listen, router, start, or_
from pydantic import BaseModel, PrivateAttr

from app.core.constants import RunStatus, StageName
from app.core.logging import get_logger
from app.domain.flows.persistence import InMemoryStageStore, StageStore
from app.domain.flows.runner import PipelineRunner, to_upstream
from app.domain.models import (
    CompetitorAnalysis,
    ContentGapReport,
    ContentStrategy,
    DraftArticle,
    EvaluationReport,
    RequestProfile,
    ResearchReport,
)

logger = get_logger("content_flow")


class PipelineState(BaseModel):
    id: str = ""  # required by CrewAI structured Flow state
    job_id: str = ""
    topic: str = ""
    audience: str = ""
    goal: str = ""
    tone: str = ""
    platform: str = ""

    request_profile: RequestProfile | None = None
    research: ResearchReport | None = None
    competitor: CompetitorAnalysis | None = None
    gaps: ContentGapReport | None = None
    strategy: ContentStrategy | None = None
    draft: DraftArticle | None = None
    evaluation: EvaluationReport | None = None

    rejected: bool = False
    rejection_reason: str | None = None
    retry_count: int = 0


class ContentIntelligenceFlow(Flow[PipelineState]):
    initial_state = PipelineState

    _runner: PipelineRunner = PrivateAttr(default=None)
    _store: StageStore = PrivateAttr(default=None)

    def __init__(
        self,
        runner: PipelineRunner,
        store: StageStore | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self._runner = runner
        self._store = store or InMemoryStageStore()

    # ── dep accessors ──
    @property
    def runner(self) -> PipelineRunner:
        return self._runner

    @property
    def store(self) -> StageStore:
        return self._store

    def _inputs(self) -> dict[str, str]:
        s = self.state
        return {
            "topic": s.topic,
            "audience": s.audience,
            "goal": s.goal,
            "tone": s.tone,
            "platform": s.platform,
        }

    def _persist(self, stage: StageName, payload: BaseModel) -> None:
        self.store.save_stage(self.state.job_id, stage, payload)
        self.store.emit_event(self.state.job_id, stage, RunStatus.COMPLETED)

    def _fail_stage(self, stage: StageName, exc: Exception) -> None:
        """Log and persist a stage failure, then re-raise with context."""
        logger.error(
            "stage_failed",
            stage=stage.value,
            job_id=self.state.job_id,
            error=str(exc),
            error_type=type(exc).__name__,
        )
        self.store.emit_event(
            self.state.job_id, stage, RunStatus.FAILED,
            detail=f"{type(exc).__name__}: {exc}",
        )
        raise RuntimeError(
            f"Pipeline stage '{stage.value}' failed for job {self.state.job_id}: {exc}"
        ) from exc

    # ── stages ──
    @start()
    def validate_request(self) -> None:
        self.store.emit_event(self.state.job_id, StageName.GUARD, RunStatus.RUNNING)
        try:
            profile = self.runner.guard(self._inputs())
        except Exception as exc:
            self._fail_stage(StageName.GUARD, exc)
        self.state.request_profile = profile
        self.state.rejected = not profile.is_valid
        self.state.rejection_reason = profile.rejection_reason
        self._persist(StageName.GUARD, profile)

    @router(validate_request)
    def route_request(self) -> str:
        return "invalid" if self.state.rejected else "valid"

    @listen("valid")
    def run_research(self) -> None:
        self.store.emit_event(self.state.job_id, StageName.RESEARCH, RunStatus.RUNNING)
        self.store.emit_event(self.state.job_id, StageName.COMPETITOR, RunStatus.RUNNING)
        try:
            research, competitor = self.runner.research(self._inputs())
        except Exception as exc:
            self._fail_stage(StageName.RESEARCH, exc)
        self.state.research = research
        self.state.competitor = competitor
        self._persist(StageName.RESEARCH, research)
        self._persist(StageName.COMPETITOR, competitor)

    @listen(run_research)
    def run_strategy(self) -> None:
        self.store.emit_event(self.state.job_id, StageName.GAP, RunStatus.RUNNING)
        self.store.emit_event(self.state.job_id, StageName.STRATEGY, RunStatus.RUNNING)
        try:
            upstream = to_upstream(self.state.research, self.state.competitor)
            gaps, strategy = self.runner.strategy(self._inputs(), upstream)
        except Exception as exc:
            self._fail_stage(StageName.STRATEGY, exc)
        self.state.gaps = gaps
        self.state.strategy = strategy
        self._persist(StageName.GAP, gaps)
        self._persist(StageName.STRATEGY, strategy)

    @listen(run_strategy)
    def run_content(self) -> None:
        self.store.emit_event(self.state.job_id, StageName.WRITER, RunStatus.RUNNING)
        try:
            upstream = to_upstream(self.state.strategy, self.state.research)
            draft = self.runner.content(self._inputs(), upstream).recount()
        except Exception as exc:
            self._fail_stage(StageName.WRITER, exc)
        self.state.draft = draft
        self._persist(StageName.WRITER, draft)

    @listen("retry")
    def run_content_retry(self) -> None:
        self.state.retry_count += 1
        self.store.emit_event(
            self.state.job_id,
            StageName.WRITER,
            RunStatus.RUNNING,
            detail=f"Regenerating draft article (Attempt {self.state.retry_count + 1}) to improve quality score from {self.state.evaluation.publish_readiness}/100 based on evaluator suggestions.",
        )
        try:
            upstream = to_upstream(self.state.strategy, self.state.research, self.state.evaluation)
            draft = self.runner.content(self._inputs(), upstream).recount()
        except Exception as exc:
            self._fail_stage(StageName.WRITER, exc)
        self.state.draft = draft
        self._persist(StageName.WRITER, draft)

    @router(or_(run_content, run_content_retry))
    def run_quality(self) -> str:
        self.store.emit_event(self.state.job_id, StageName.EVALUATOR, RunStatus.RUNNING)
        try:
            upstream = to_upstream(self.state.draft)
            evaluation = self.runner.quality(self._inputs(), upstream)
        except Exception as exc:
            self._fail_stage(StageName.EVALUATOR, exc)
        self.state.evaluation = evaluation
        self._persist(StageName.EVALUATOR, evaluation)

        if self.state.evaluation.publish_readiness < 90.0 and self.state.retry_count < 2:
            logger.info(
                "quality_score_below_threshold_triggering_retry",
                job_id=self.state.job_id,
                score=self.state.evaluation.publish_readiness,
                retry_count=self.state.retry_count,
            )
            return "retry"
        else:
            logger.info(
                "quality_score_accepted_or_max_retries_reached",
                job_id=self.state.job_id,
                score=self.state.evaluation.publish_readiness,
                retry_count=self.state.retry_count,
            )
            return "approved"

    @listen("approved")
    def finalize_flow(self) -> None:
        logger.info(
            "flow_finalized",
            job_id=self.state.job_id,
            final_score=self.state.evaluation.publish_readiness,
            retries=self.state.retry_count,
        )

    @listen("invalid")
    def finalize_rejected(self) -> None:
        logger.info("request_rejected", job_id=self.state.job_id,
                    reason=self.state.rejection_reason)

