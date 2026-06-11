"""Phase 6 agent tests with mocked LLM (req 7) — no network."""
from __future__ import annotations

from app.domain.agents import AgentFactory, AgentName
from app.domain.agents.prompt_loader import get_prompt
from app.domain.models import RequestProfile
from tests.fakes import FakeLLM


def test_prompts_load_for_all_agents():
    for name in AgentName:
        p = get_prompt(name.value)
        assert p.role and p.goal and p.backstory


def test_factory_builds_each_agent_with_role():
    llm = FakeLLM({"ok": True})
    factory = AgentFactory(llm)
    agents = {
        AgentName.GUARD: factory.guard(),
        AgentName.GAP: factory.gap(),
        AgentName.STRATEGIST: factory.strategist(),
        AgentName.WRITER: factory.writer(),
        AgentName.EVALUATOR: factory.evaluator(),
        AgentName.RESEARCH: factory.research(tools=[]),
        AgentName.COMPETITOR: factory.competitor(tools=[]),
    }
    for name, agent in agents.items():
        assert agent.role == get_prompt(name.value).role
        assert agent.llm is llm


def test_fake_llm_parses_response_model():
    llm = FakeLLM(
        {
            "is_valid": True,
            "topic": "ai marketing",
            "audience": "founders",
            "goal": "educate",
            "tone": "professional",
            "platform": "blog",
        }
    )
    result = llm.call("validate this", response_model=RequestProfile)
    assert isinstance(result, RequestProfile)
    assert result.is_valid and result.topic == "ai marketing"
    assert len(llm.calls) == 1


def test_openrouter_llm_extract_json_helpers():
    from app.domain.llm.openrouter_llm import _extract_json

    assert _extract_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert _extract_json('noise {"b": 2} trailing') == {"b": 2}
    assert _extract_json('{"c": 3}') == {"c": 3}
