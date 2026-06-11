"""EvaluationReport — output of the Evaluator Agent (publish readiness)."""
from __future__ import annotations

from pydantic import BaseModel, Field, computed_field


class DimensionScore(BaseModel):
    score: float = Field(..., ge=0, le=100, description="0-100 score for the dimension.")
    rationale: str = Field("", description="Why this score was given.")
    suggestions: list[str] = Field(
        default_factory=list, description="Concrete improvements."
    )


class EvaluationReport(BaseModel):
    seo: DimensionScore
    readability: DimensionScore
    structure: DimensionScore
    trustworthiness: DimensionScore
    audience_match: DimensionScore
    summary: str = Field("", description="Overall evaluation summary.")

    # Weights sum to 1.0; SEO and audience match weighted highest.
    _WEIGHTS = {
        "seo": 0.25,
        "readability": 0.20,
        "structure": 0.15,
        "trustworthiness": 0.15,
        "audience_match": 0.25,
    }

    @computed_field  # type: ignore[prop-decorator]
    @property
    def publish_readiness(self) -> float:
        """Weighted aggregate publish-readiness score (0-100, 2 dp)."""
        total = (
            self.seo.score * self._WEIGHTS["seo"]
            + self.readability.score * self._WEIGHTS["readability"]
            + self.structure.score * self._WEIGHTS["structure"]
            + self.trustworthiness.score * self._WEIGHTS["trustworthiness"]
            + self.audience_match.score * self._WEIGHTS["audience_match"]
        )
        return round(total, 2)
