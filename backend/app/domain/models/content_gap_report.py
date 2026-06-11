"""ContentGapReport — output of the Content Gap Agent."""
from __future__ import annotations

from pydantic import BaseModel, Field


class ContentGap(BaseModel):
    topic: str = Field(..., description="A topic competitors miss or under-cover.")
    opportunity: str = Field(..., description="Why this gap is worth pursuing.")
    priority: int = Field(
        3, ge=1, le=5, description="Priority 1 (low) to 5 (high)."
    )
    suggested_angle: str = Field("", description="Recommended way to address the gap.")


class ContentGapReport(BaseModel):
    summary: str = Field(..., description="Overview of the gap analysis.")
    missing_topics: list[ContentGap] = Field(default_factory=list)
    unique_opportunities: list[str] = Field(
        default_factory=list, description="Distinct angles not covered by competitors."
    )
    recommended_focus: str = Field(
        "", description="The single highest-leverage focus for this article."
    )
