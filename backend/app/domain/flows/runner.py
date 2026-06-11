"""PipelineRunner — the seam between flows and crews.

Flows depend on this protocol (not concrete crews), so they can be tested with a
fake runner and zero LLM calls. The concrete CrewPipelineRunner builds the four
crews, runs them, and returns parsed Pydantic contracts.
"""
from __future__ import annotations

import json
from typing import Any, Protocol

from app.core.logging import get_logger
from app.domain.crews import CrewBuilder
from app.domain.models import (
    CompetitorAnalysis,
    ContentGapReport,
    ContentStrategy,
    DraftArticle,
    EvaluationReport,
    RequestProfile,
    ResearchReport,
)

logger = get_logger("pipeline_runner")

Inputs = dict[str, str]


class PipelineRunner(Protocol):
    def guard(self, inputs: Inputs) -> RequestProfile: ...
    def research(self, inputs: Inputs) -> tuple[ResearchReport, CompetitorAnalysis]: ...
    def strategy(
        self, inputs: Inputs, upstream: str
    ) -> tuple[ContentGapReport, ContentStrategy]: ...
    def content(self, inputs: Inputs, upstream: str) -> DraftArticle: ...
    def quality(self, inputs: Inputs, upstream: str) -> EvaluationReport: ...


class CrewOutputError(RuntimeError):
    """Raised when a crew produces no parseable structured output."""


def _outputs(crew_result: Any, *, stage: str, expected: int) -> list[Any]:
    """Return the parsed pydantic object for each task, in order.

    Raises CrewOutputError when any task output has no valid pydantic parse,
    so failures propagate with context instead of silent None downstream.
    """
    parsed = []
    tasks_output = getattr(crew_result, "tasks_output", []) or []
    for i, t in enumerate(tasks_output):
        obj = getattr(t, "pydantic", None)
        if obj is None:
            raw_preview = str(getattr(t, "raw", ""))[:500]
            raise CrewOutputError(
                f"{stage} task {i} produced no parseable pydantic output. "
                f"Raw output preview: {raw_preview!r}"
            )
        parsed.append(obj)
    if len(parsed) < expected:
        raise CrewOutputError(
            f"{stage} crew returned {len(parsed)} task outputs, expected {expected}. "
            f"Crew result type: {type(crew_result).__name__}"
        )
    return parsed


class CrewPipelineRunner:
    """Concrete runner backed by real CrewAI crews."""

    def __init__(self, builder: CrewBuilder) -> None:
        self._builder = builder

    def guard(self, inputs: Inputs) -> RequestProfile:
        result = self._builder.guard_crew().kickoff(inputs=dict(inputs))
        return _outputs(result, stage="guard", expected=1)[0]

    def research(self, inputs: Inputs) -> tuple[ResearchReport, CompetitorAnalysis]:
        result = self._builder.research_crew().kickoff(inputs=dict(inputs))
        out = _outputs(result, stage="research", expected=2)
        return out[0], out[1]

    def strategy(
        self, inputs: Inputs, upstream: str
    ) -> tuple[ContentGapReport, ContentStrategy]:
        merged = {**inputs, "upstream": upstream}
        result = self._builder.strategy_crew().kickoff(inputs=merged)
        out = _outputs(result, stage="strategy", expected=2)
        return out[0], out[1]

    def content(self, inputs: Inputs, upstream: str) -> DraftArticle:
        merged = {**inputs, "upstream": upstream}
        result = self._builder.content_crew().kickoff(inputs=merged)
        return _outputs(result, stage="content", expected=1)[0]

    def quality(self, inputs: Inputs, upstream: str) -> EvaluationReport:
        merged = {**inputs, "upstream": upstream}
        result = self._builder.quality_crew().kickoff(inputs=merged)
        return _outputs(result, stage="quality", expected=1)[0]


def to_upstream(*models: Any) -> str:
    """Serialize upstream contracts into a compact JSON context block."""
    return json.dumps([m.model_dump() for m in models if m is not None], default=str)

