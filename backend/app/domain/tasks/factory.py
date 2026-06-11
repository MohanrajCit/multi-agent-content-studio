"""Task factory — builds CrewAI Tasks bound to agents, contracts, and guardrails.

Each task sets `output_pydantic` so CrewAI enforces the schema (req: output_pydantic
validation), attaches a semantic guardrail, and wires upstream outputs via context.
"""
from __future__ import annotations

import enum
from typing import Any

from crewai import Agent, Task

from app.domain.models import (
    CompetitorAnalysis,
    ContentGapReport,
    ContentStrategy,
    DraftArticle,
    EvaluationReport,
    RequestProfile,
    ResearchReport,
)
from app.domain.tasks import guardrails as g
from app.domain.tasks.task_loader import get_task_spec


class TaskName(str, enum.Enum):
    GUARD = "guard"
    RESEARCH = "research"
    COMPETITOR = "competitor"
    GAP = "gap"
    STRATEGIST = "strategist"
    WRITER = "writer"
    EVALUATOR = "evaluator"


# task -> (output contract, guardrail)
_BINDINGS: dict[TaskName, tuple[type, Any]] = {
    TaskName.GUARD: (RequestProfile, g.guard_request),
    TaskName.RESEARCH: (ResearchReport, g.guard_research),
    TaskName.COMPETITOR: (CompetitorAnalysis, g.guard_competitor),
    TaskName.GAP: (ContentGapReport, g.guard_gap),
    TaskName.STRATEGIST: (ContentStrategy, g.guard_strategy),
    TaskName.WRITER: (DraftArticle, g.guard_draft),
    TaskName.EVALUATOR: (EvaluationReport, g.guard_evaluation),
}


class TaskFactory:
    """Builds CrewAI Tasks. Each task owns exactly one agent + one contract."""

    def build(
        self,
        name: TaskName,
        agent: Agent,
        *,
        context: list[Task] | None = None,
        guardrail_max_retries: int = 2,
    ) -> Task:
        spec = get_task_spec(name.value)
        output_model, guardrail = _BINDINGS[name]
        return Task(
            description=spec.description,
            expected_output=spec.expected_output,
            agent=agent,
            output_pydantic=output_model,
            guardrail=guardrail,
            guardrail_max_retries=guardrail_max_retries,
            context=context or [],
        )

    def output_model(self, name: TaskName) -> type:
        return _BINDINGS[name][0]
