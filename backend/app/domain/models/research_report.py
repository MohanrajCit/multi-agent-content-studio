"""ResearchReport — output of the Research Agent (Serper-backed)."""
from __future__ import annotations

from pydantic import BaseModel, Field


class SearchTrend(BaseModel):
    term: str = Field(..., description="Trending term or query.")
    rationale: str = Field("", description="Why this is relevant/trending.")


class PeopleAlsoAsk(BaseModel):
    question: str = Field(..., description="A 'People Also Ask' question.")
    intent: str = Field("", description="Inferred search intent behind the question.")


class SourceLink(BaseModel):
    title: str = Field(..., description="Source page title.")
    url: str = Field(..., description="Source URL.")
    snippet: str = Field("", description="Result snippet.")


class ResearchReport(BaseModel):
    summary: str = Field(..., description="Executive summary of the research findings.")
    trends: list[SearchTrend] = Field(default_factory=list)
    related_searches: list[str] = Field(default_factory=list)
    people_also_ask: list[PeopleAlsoAsk] = Field(default_factory=list)
    sources: list[SourceLink] = Field(default_factory=list)
    primary_keywords: list[str] = Field(
        default_factory=list, description="High-value keywords to target."
    )
