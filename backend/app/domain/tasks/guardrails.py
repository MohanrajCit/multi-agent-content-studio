"""Task guardrails — semantic validation on top of output_pydantic.

CrewAI calls a guardrail with the TaskOutput and expects (ok, data_or_error):
returning (False, "message") triggers an automatic agent retry. output_pydantic
already guarantees the schema; these guardrails enforce *content* constraints
(non-empty results, score ranges, outline/draft consistency).

NOTE: do not add `from __future__ import annotations` here — CrewAI inspects the
guardrail's real return annotation and requires a literal Tuple[bool, Any].
"""
from typing import Any, Tuple

from app.core.logging import get_logger
from app.domain.models import (
    CompetitorAnalysis,
    ContentGapReport,
    ContentStrategy,
    DraftArticle,
    EvaluationReport,
    RequestProfile,
    ResearchReport,
)

logger = get_logger("guardrails")


def _pydantic(output: Any) -> Any:
    """Extract the parsed pydantic object from a CrewAI TaskOutput (or passthrough).

    Returns None when CrewAI's internal output_pydantic parsing fails (the
    TaskOutput.pydantic attribute is set to None).  Callers must handle None.
    """
    return getattr(output, "pydantic", output)


def _require_parsed(output: Any, model_name: str) -> Tuple[bool, Any]:
    """Return a retry signal if pydantic parsing produced None.

    When CrewAI cannot parse the LLM output into the expected Pydantic model
    (e.g. markdown-wrapped JSON, extraneous text, schema mismatch), it sets
    TaskOutput.pydantic = None.  Instead of crashing with AttributeError we
    return (False, message) so CrewAI retries the agent.
    """
    obj = _pydantic(output)
    if obj is None:
        msg = (
            f"Failed to parse agent output into {model_name}. "
            f"Return ONLY valid JSON matching the {model_name} schema — "
            f"no markdown fences, no extra text."
        )
        logger.warning("guardrail_parse_failed", model=model_name,
                        raw_preview=str(getattr(output, "raw", ""))[:300])
        return (False, msg)
    return (True, obj)


def guard_request(output: Any) -> Tuple[bool, Any]:
    ok, obj = _require_parsed(output, "RequestProfile")
    if not ok:
        return (False, obj)  # obj is the error message
    obj: RequestProfile
    if obj.is_valid and not obj.topic.strip():
        return (False, "Valid request must have a non-empty normalized topic.")
    if not obj.is_valid and not (obj.rejection_reason or "").strip():
        return (False, "Rejected request must include a rejection_reason.")
    return (True, obj)


def guard_research(output: Any) -> Tuple[bool, Any]:
    ok, obj = _require_parsed(output, "ResearchReport")
    if not ok:
        return (False, obj)
    obj: ResearchReport
    if not (obj.sources or obj.trends or obj.people_also_ask):
        return (False, "ResearchReport must contain at least one source, trend, or PAA question.")
    if not obj.summary.strip():
        return (False, "ResearchReport.summary must not be empty.")
    return (True, obj)


def guard_competitor(output: Any) -> Tuple[bool, Any]:
    ok, obj = _require_parsed(output, "CompetitorAnalysis")
    if not ok:
        return (False, obj)
    obj: CompetitorAnalysis
    if not obj.competitors:
        return (False, "CompetitorAnalysis must include at least one competitor profile.")
    return (True, obj)


def guard_gap(output: Any) -> Tuple[bool, Any]:
    ok, obj = _require_parsed(output, "ContentGapReport")
    if not ok:
        return (False, obj)
    obj: ContentGapReport
    if not (obj.missing_topics or obj.unique_opportunities):
        return (False, "ContentGapReport must list at least one missing topic or opportunity.")
    return (True, obj)


def guard_strategy(output: Any) -> Tuple[bool, Any]:
    ok, obj = _require_parsed(output, "ContentStrategy")
    if not ok:
        return (False, obj)
    obj: ContentStrategy
    if not obj.outline:
        return (False, "ContentStrategy.outline must contain at least one section.")
    ids = [s.section_id for s in obj.outline]
    if len(ids) != len(set(ids)):
        return (False, "ContentStrategy outline section_ids must be unique.")
    if any(not s.heading.strip() for s in obj.outline):
        return (False, "Every outline section must have a heading.")
    return (True, obj)


def guard_draft(output: Any) -> Tuple[bool, Any]:
    ok, obj = _require_parsed(output, "DraftArticle")
    if not ok:
        return (False, obj)
    obj: DraftArticle
    if not obj.sections:
        return (False, "DraftArticle must contain at least one section.")
    if any(not s.content.strip() for s in obj.sections):
        return (False, "Every draft section must have non-empty content.")
    obj.recount()  # normalize word counts
    return (True, obj)


def guard_evaluation(output: Any) -> Tuple[bool, Any]:
    ok, obj = _require_parsed(output, "EvaluationReport")
    if not ok:
        return (False, obj)
    obj: EvaluationReport
    for name in ("seo", "readability", "structure", "trustworthiness", "audience_match"):
        dim = getattr(obj, name)
        if not (0 <= dim.score <= 100):
            return (False, f"{name} score must be between 0 and 100.")
    return (True, obj)
