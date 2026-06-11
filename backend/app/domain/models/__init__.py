"""The 7 structured-output contracts — the inter-agent protocol.

These Pydantic models are the single source of truth for agent I/O. They are
persisted to PostgreSQL (as JSONB payloads) and surfaced to the frontend.
"""
from app.domain.models.competitor_analysis import (
    CompetitorAnalysis,
    CompetitorProfile,
)
from app.domain.models.content_gap_report import ContentGap, ContentGapReport
from app.domain.models.content_strategy import (
    ContentStrategy,
    KeywordPlan,
    OutlineSection,
)
from app.domain.models.draft_article import DraftArticle, DraftSection
from app.domain.models.evaluation_report import DimensionScore, EvaluationReport
from app.domain.models.request_profile import RequestProfile
from app.domain.models.research_report import (
    PeopleAlsoAsk,
    ResearchReport,
    SearchTrend,
    SourceLink,
)

__all__ = [
    "RequestProfile",
    "ResearchReport",
    "SearchTrend",
    "PeopleAlsoAsk",
    "SourceLink",
    "CompetitorAnalysis",
    "CompetitorProfile",
    "ContentGapReport",
    "ContentGap",
    "ContentStrategy",
    "OutlineSection",
    "KeywordPlan",
    "DraftArticle",
    "DraftSection",
    "EvaluationReport",
    "DimensionScore",
]
