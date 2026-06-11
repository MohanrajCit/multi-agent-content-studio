"""CompetitorAnalysis — output of the Competitor Analysis Agent."""
from __future__ import annotations

from pydantic import BaseModel, Field


class CompetitorProfile(BaseModel):
    url: str = Field(..., description="Competitor page URL.")
    title: str = Field("", description="Competitor page title.")
    headings: list[str] = Field(
        default_factory=list, description="Extracted H1-H3 headings."
    )
    topics_covered: list[str] = Field(
        default_factory=list, description="Distinct topics/themes the page covers."
    )
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)


class CompetitorAnalysis(BaseModel):
    summary: str = Field(..., description="Overview of the competitive landscape.")
    competitors: list[CompetitorProfile] = Field(default_factory=list)
    commonly_covered_topics: list[str] = Field(
        default_factory=list,
        description="Topics most competitors cover (table stakes).",
    )
    differentiation_opportunities: list[str] = Field(
        default_factory=list,
        description="Angles competitors under-serve.",
    )
