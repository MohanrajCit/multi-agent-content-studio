"""Phase 8 flow tests — fake runner, no LLM. Verify ordering, routing, persistence."""
from __future__ import annotations

from app.core.constants import RunStatus, StageName
from app.domain.flows import (
    ContentIntelligenceFlow,
    InMemoryStageStore,
    SectionRegenerationFlow,
)
from app.domain.models import (
    CompetitorAnalysis,
    CompetitorProfile,
    ContentGap,
    ContentGapReport,
    ContentStrategy,
    DimensionScore,
    DraftArticle,
    DraftSection,
    EvaluationReport,
    OutlineSection,
    RequestProfile,
    ResearchReport,
    SearchTrend,
)


def _valid_profile():
    return RequestProfile(
        is_valid=True, topic="t", audience="a", goal="g", tone="to", platform="p"
    )


def _research():
    return (
        ResearchReport(summary="s", trends=[SearchTrend(term="x")]),
        CompetitorAnalysis(summary="s", competitors=[CompetitorProfile(url="u")]),
    )


def _strategy():
    return (
        ContentGapReport(summary="s", missing_topics=[ContentGap(topic="m", opportunity="o")]),
        ContentStrategy(
            brief="b", search_intent="i", title="T",
            outline=[OutlineSection(section_id="intro", heading="Intro")],
        ),
    )


def _draft():
    return DraftArticle(
        title="T",
        sections=[DraftSection(section_id="intro", heading="Intro", content="a b c")],
    )


def _evaluation(score=95):
    d = DimensionScore(score=score)
    return EvaluationReport(
        seo=d, readability=d, structure=d, trustworthiness=d, audience_match=d
    )


class FakeRunner:
    def __init__(self, profile=None, score=95):
        self._profile = profile or _valid_profile()
        self._score = score
        self.calls: list[str] = []

    def guard(self, inputs):
        self.calls.append("guard")
        return self._profile

    def research(self, inputs):
        self.calls.append("research")
        return _research()

    def strategy(self, inputs, upstream):
        self.calls.append("strategy")
        return _strategy()

    def content(self, inputs, upstream):
        self.calls.append("content")
        return _draft()

    def quality(self, inputs, upstream):
        self.calls.append("quality")
        return _evaluation(score=self._score)


def _kickoff_inputs():
    return {
        "job_id": "job-1", "topic": "ai", "audience": "founders",
        "goal": "educate", "tone": "pro", "platform": "blog",
    }


def test_full_pipeline_runs_all_stages_in_order():
    runner = FakeRunner()
    store = InMemoryStageStore()
    flow = ContentIntelligenceFlow(runner, store)
    flow.kickoff(inputs=_kickoff_inputs())

    assert runner.calls == ["guard", "research", "strategy", "content", "quality"]
    # all stage outputs persisted
    for stage in (StageName.GUARD, StageName.RESEARCH, StageName.COMPETITOR,
                  StageName.GAP, StageName.STRATEGY, StageName.WRITER, StageName.EVALUATOR):
        assert store.get("job-1", stage) is not None
    assert flow.state.evaluation.publish_readiness == 95.0


def test_pipeline_retries_on_low_quality_score():
    class ImprovingRunner(FakeRunner):
        def __init__(self):
            super().__init__(score=70)

        def quality(self, inputs, upstream):
            self.calls.append("quality")
            current_score = self._score
            self._score = 95
            return _evaluation(score=current_score)

    runner = ImprovingRunner()
    store = InMemoryStageStore()
    flow = ContentIntelligenceFlow(runner, store)
    flow.kickoff(inputs=_kickoff_inputs())

    assert runner.calls == [
        "guard", "research", "strategy", "content", "quality", "content", "quality"
    ]
    assert flow.state.retry_count == 1
    assert flow.state.evaluation.publish_readiness == 95.0


def test_invalid_request_short_circuits():
    rejected = RequestProfile(
        is_valid=False, rejection_reason="injection", injection_detected=True,
        topic="", audience="a", goal="g", tone="t", platform="p",
    )
    runner = FakeRunner(profile=rejected)
    store = InMemoryStageStore()
    flow = ContentIntelligenceFlow(runner, store)
    flow.kickoff(inputs=_kickoff_inputs())

    # only guard ran — no paid crews
    assert runner.calls == ["guard"]
    assert flow.state.rejected is True
    assert store.get("job-1", StageName.RESEARCH) is None


def test_stage_events_emitted():
    runner = FakeRunner()
    store = InMemoryStageStore()
    ContentIntelligenceFlow(runner, store).kickoff(inputs=_kickoff_inputs())

    seq = store.event_sequence()
    # guard emits RUNNING then COMPLETED first
    assert seq[0] == (StageName.GUARD, RunStatus.RUNNING)
    assert (StageName.EVALUATOR, RunStatus.COMPLETED) in seq


def test_section_regeneration_swaps_one_section():
    base = DraftArticle(
        title="T",
        sections=[
            DraftSection(section_id="intro", heading="Intro", content="old intro"),
            DraftSection(section_id="body", heading="Body", content="body stays"),
        ],
    )

    class RegenRunner(FakeRunner):
        def content(self, inputs, upstream):
            self.calls.append("content")
            return DraftArticle(
                title="T",
                sections=[DraftSection(section_id="intro", heading="Intro",
                                       content="brand new intro text")],
            )

    runner = RegenRunner()
    store = InMemoryStageStore()
    flow = SectionRegenerationFlow(runner, store)
    flow.kickoff(inputs={
        "job_id": "job-1", "section_id": "intro", "instruction": "make it punchier",
        "topic": "ai", "audience": "founders", "goal": "educate",
        "tone": "pro", "platform": "blog",
        "base_draft": base.model_dump(), "strategy": None,
    })

    new = flow.state.new_draft
    assert new is not None
    intro = next(s for s in new.sections if s.section_id == "intro")
    body = next(s for s in new.sections if s.section_id == "body")
    assert intro.content == "brand new intro text"  # swapped
    assert body.content == "body stays"             # untouched
    assert flow.state.evaluation is not None         # re-scored
