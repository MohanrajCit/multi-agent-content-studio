"""Phase 6 contract-model tests: validation + computed publish readiness."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.domain.models import (
    DimensionScore,
    DraftArticle,
    DraftSection,
    EvaluationReport,
    RequestProfile,
)


def test_request_profile_valid_and_invalid():
    ok = RequestProfile(
        is_valid=True, topic="t", audience="a", goal="g", tone="to", platform="p"
    )
    assert ok.is_valid and ok.injection_detected is False

    rejected = RequestProfile(
        is_valid=False, rejection_reason="empty topic", topic="", audience="a",
        goal="g", tone="t", platform="p", injection_detected=True,
    )
    assert rejected.rejection_reason == "empty topic"


def test_draft_recount():
    art = DraftArticle(
        title="X",
        sections=[
            DraftSection(section_id="intro", heading="Intro", content="one two three"),
            DraftSection(section_id="body", heading="Body", content="four five"),
        ],
    ).recount()
    assert art.sections[0].word_count == 3
    assert art.word_count == 5


def test_evaluation_publish_readiness_weighted():
    rep = EvaluationReport(
        seo=DimensionScore(score=80),
        readability=DimensionScore(score=90),
        structure=DimensionScore(score=70),
        trustworthiness=DimensionScore(score=60),
        audience_match=DimensionScore(score=100),
    )
    # 80*.25 + 90*.20 + 70*.15 + 60*.15 + 100*.25 = 20+18+10.5+9+25 = 82.5
    assert rep.publish_readiness == 82.5
    # computed field is serialized
    assert rep.model_dump()["publish_readiness"] == 82.5


def test_dimension_score_bounds():
    with pytest.raises(ValidationError):
        DimensionScore(score=150)
