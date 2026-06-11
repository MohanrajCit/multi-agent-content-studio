"""SectionRegenerationFlow — incremental single-section rewrite.

Reuses the Content + Quality crews only (no research/strategy re-run). Given a
base draft and a target section, it asks the writer to rewrite that one section
using the existing strategy as context, assembles a new draft version, and
re-scores it. Emits the same stage events as the full pipeline.
"""
from __future__ import annotations

from typing import Any

from crewai.flow.flow import Flow, listen, start
from pydantic import BaseModel, PrivateAttr

from app.core.constants import RunStatus, StageName
from app.core.logging import get_logger
from app.domain.flows.persistence import InMemoryStageStore, StageStore
from app.domain.flows.runner import PipelineRunner, to_upstream
from app.domain.models import ContentStrategy, DraftArticle, EvaluationReport

logger = get_logger("section_regen_flow")


class SectionRegenState(BaseModel):
    id: str = ""  # required by CrewAI structured Flow state
    job_id: str = ""
    audience: str = ""
    goal: str = ""
    tone: str = ""
    platform: str = ""
    topic: str = ""

    section_id: str = ""
    instruction: str = ""
    base_draft: DraftArticle | None = None
    strategy: ContentStrategy | None = None

    new_draft: DraftArticle | None = None
    evaluation: EvaluationReport | None = None


class SectionRegenerationFlow(Flow[SectionRegenState]):
    initial_state = SectionRegenState

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

    @start()
    def rewrite_section(self) -> None:
        self.store.emit_event(self.state.job_id, StageName.WRITER, RunStatus.RUNNING)
        target = next(
            (s for s in self.state.base_draft.sections
             if s.section_id == self.state.section_id),
            None,
        )
        # Context = strategy + the specific section + the user's instruction.
        upstream = to_upstream(self.state.strategy)
        regen_inputs = {
            **self._inputs(),
            "upstream": upstream,
            "section_heading": target.heading if target else self.state.section_id,
            "instruction": self.state.instruction,
        }
        rewritten = self.runner.content(regen_inputs, upstream)

        # Assemble a new draft: clone base sections, swap the target one.
        new_section = next(
            (s for s in rewritten.sections if s.section_id == self.state.section_id),
            rewritten.sections[0] if rewritten.sections else None,
        )
        sections = []
        for s in self.state.base_draft.sections:
            if new_section is not None and s.section_id == self.state.section_id:
                swapped = new_section.model_copy(update={"section_id": s.section_id})
                sections.append(swapped)
            else:
                sections.append(s)
        new_draft = DraftArticle(
            title=self.state.base_draft.title,
            meta_description=self.state.base_draft.meta_description,
            sections=sections,
        ).recount()
        self.state.new_draft = new_draft
        self.store.save_stage(self.state.job_id, StageName.WRITER, new_draft)
        self.store.emit_event(self.state.job_id, StageName.WRITER, RunStatus.COMPLETED)

    @listen(rewrite_section)
    def rescore(self) -> EvaluationReport:
        self.store.emit_event(self.state.job_id, StageName.EVALUATOR, RunStatus.RUNNING)
        upstream = to_upstream(self.state.new_draft)
        evaluation = self.runner.quality(self._inputs(), upstream)
        self.state.evaluation = evaluation
        self.store.save_stage(self.state.job_id, StageName.EVALUATOR, evaluation)
        self.store.emit_event(self.state.job_id, StageName.EVALUATOR, RunStatus.COMPLETED)
        return evaluation
