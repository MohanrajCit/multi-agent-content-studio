"""Phase 7 task-definition + guardrail tests (no network, mocked LLM)."""
from __future__ import annotations

from types import SimpleNamespace

from app.domain.agents import AgentFactory
from app.domain.models import (
    CompetitorAnalysis,
    CompetitorProfile,
    ContentGapReport,
    ContentStrategy,
    DimensionScore,
    DraftArticle,
    DraftSection,
    EvaluationReport,
    OutlineSection,
    RequestProfile,
    ResearchReport,
    SourceLink,
)
from app.domain.tasks import TaskFactory, TaskName
from app.domain.tasks import guardrails as g
from tests.fakes import FakeLLM


def _out(pydantic_obj):
    """Mimic a CrewAI TaskOutput exposing `.pydantic`."""
    return SimpleNamespace(pydantic=pydantic_obj)


def test_task_factory_binds_agent_and_output_pydantic():
    factory = TaskFactory()
    agent = AgentFactory(FakeLLM({"ok": True})).guard()
    task = factory.build(TaskName.GUARD, agent)
    assert task.agent is agent
    assert task.output_pydantic is RequestProfile
    assert task.guardrail is not None
    assert task.description and task.expected_output


def test_all_tasks_bind_correct_contract():
    factory = TaskFactory()
    af = AgentFactory(FakeLLM({"ok": True}))
    agents = {
        TaskName.GUARD: af.guard(),
        TaskName.RESEARCH: af.research([]),
        TaskName.COMPETITOR: af.competitor([]),
        TaskName.GAP: af.gap(),
        TaskName.STRATEGIST: af.strategist(),
        TaskName.WRITER: af.writer(),
        TaskName.EVALUATOR: af.evaluator(),
    }
    expected = {
        TaskName.GUARD: RequestProfile,
        TaskName.RESEARCH: ResearchReport,
        TaskName.COMPETITOR: CompetitorAnalysis,
        TaskName.GAP: ContentGapReport,
        TaskName.STRATEGIST: ContentStrategy,
        TaskName.WRITER: DraftArticle,
        TaskName.EVALUATOR: EvaluationReport,
    }
    for name, agent in agents.items():
        task = factory.build(name, agent)
        assert task.output_pydantic is expected[name]


def test_task_context_wiring():
    factory = TaskFactory()
    af = AgentFactory(FakeLLM({"ok": True}))
    research = factory.build(TaskName.RESEARCH, af.research([]))
    gap = factory.build(TaskName.GAP, af.gap(), context=[research])
    assert research in gap.context


# ── guardrail behavior ──

def test_guard_research_rejects_empty():
    bad = ResearchReport(summary="")
    ok, _ = g.guard_research(_out(bad))
    assert ok is False


def test_guard_research_passes_with_source():
    good = ResearchReport(summary="s", sources=[SourceLink(title="t", url="u")])
    ok, data = g.guard_research(_out(good))
    assert ok is True and data is good


def test_guard_strategy_rejects_duplicate_section_ids():
    strat = ContentStrategy(
        brief="b", search_intent="i", title="t",
        outline=[
            OutlineSection(section_id="x", heading="A"),
            OutlineSection(section_id="x", heading="B"),
        ],
    )
    ok, msg = g.guard_strategy(_out(strat))
    assert ok is False and "unique" in msg


def test_guard_draft_recounts_words():
    draft = DraftArticle(
        title="T",
        sections=[DraftSection(section_id="a", heading="A", content="one two three")],
    )
    ok, data = g.guard_draft(_out(draft))
    assert ok is True
    assert data.sections[0].word_count == 3
    assert data.word_count == 3


def test_guard_competitor_requires_profile():
    ok, _ = g.guard_competitor(_out(CompetitorAnalysis(summary="s")))
    assert ok is False
    good = CompetitorAnalysis(summary="s", competitors=[CompetitorProfile(url="u")])
    ok2, _ = g.guard_competitor(_out(good))
    assert ok2 is True


def test_guard_evaluation_passes_in_range():
    rep = EvaluationReport(
        seo=DimensionScore(score=50), readability=DimensionScore(score=50),
        structure=DimensionScore(score=50), trustworthiness=DimensionScore(score=50),
        audience_match=DimensionScore(score=50),
    )
    ok, data = g.guard_evaluation(_out(rep))
    assert ok is True and data.publish_readiness == 50.0
