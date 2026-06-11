"""DraftArticle — output of the Writer Agent. Sections are addressable for
versioned draft management and single-section regeneration."""
from __future__ import annotations

from pydantic import BaseModel, Field


class DraftSection(BaseModel):
    section_id: str = Field(..., description="Matches OutlineSection.section_id.")
    heading: str = Field(..., description="Rendered section heading.")
    content: str = Field(..., description="Markdown body of the section.")
    word_count: int = Field(0, ge=0)


class DraftArticle(BaseModel):
    title: str = Field(..., description="Final article title.")
    meta_description: str = Field("", description="SEO meta description.")
    sections: list[DraftSection] = Field(default_factory=list)
    word_count: int = Field(0, ge=0, description="Total word count across sections.")

    def recount(self) -> "DraftArticle":
        """Recompute per-section and total word counts."""
        total = 0
        for s in self.sections:
            s.word_count = len(s.content.split())
            total += s.word_count
        self.word_count = total
        return self
