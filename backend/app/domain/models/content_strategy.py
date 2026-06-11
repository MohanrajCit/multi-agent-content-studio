"""ContentStrategy — output of the Strategist Agent."""
from __future__ import annotations

from pydantic import BaseModel, Field


class KeywordPlan(BaseModel):
    primary: list[str] = Field(default_factory=list)
    secondary: list[str] = Field(default_factory=list)
    long_tail: list[str] = Field(default_factory=list)


class OutlineSection(BaseModel):
    section_id: str = Field(..., description="Stable slug id, e.g. 'introduction'.")
    heading: str = Field(..., description="Section heading.")
    key_points: list[str] = Field(
        default_factory=list, description="Bullet points the section must cover."
    )
    target_keywords: list[str] = Field(default_factory=list)
    estimated_words: int = Field(200, ge=0, description="Target word count.")


class ContentStrategy(BaseModel):
    brief: str = Field(..., description="Content brief / angle for the article.")
    search_intent: str = Field(..., description="Dominant search intent addressed.")
    title: str = Field(..., description="Working title for the article.")
    keyword_plan: KeywordPlan = Field(default_factory=KeywordPlan)
    outline: list[OutlineSection] = Field(default_factory=list)
    tone_guidelines: str = Field("", description="Tone/voice guidance for the writer.")
