"""Agent factory — one single-responsibility builder per agent (req 6).

Each agent's role/goal/backstory comes from the externalized YAML (req 3) and
its LLM is our OpenRouter-backed adapter (req 4). Tools are injected by the
crews (Phase 7) so agents stay decoupled from concrete tool wiring.
"""
from __future__ import annotations

import enum
from typing import Any

from crewai import Agent

from app.domain.agents.prompt_loader import get_prompt


class AgentName(str, enum.Enum):
    GUARD = "guard"
    RESEARCH = "research"
    COMPETITOR = "competitor"
    GAP = "gap"
    STRATEGIST = "strategist"
    WRITER = "writer"
    EVALUATOR = "evaluator"


class AgentFactory:
    """Builds CrewAI Agents bound to a given LLM."""

    def __init__(self, llm: Any) -> None:
        self._llm = llm

    def build(
        self,
        name: AgentName,
        *,
        tools: list[Any] | None = None,
        allow_delegation: bool = False,
        max_iter: int = 8,
    ) -> Agent:
        prompt = get_prompt(name.value)
        return Agent(
            role=prompt.role,
            goal=prompt.goal,
            backstory=prompt.backstory,
            llm=self._llm,
            tools=tools or [],
            allow_delegation=allow_delegation,
            max_iter=max_iter,
            verbose=False,
        )

    # Explicit single-responsibility constructors (readability + DI clarity).
    def guard(self) -> Agent:
        return self.build(AgentName.GUARD)

    def research(self, tools: list[Any]) -> Agent:
        return self.build(AgentName.RESEARCH, tools=tools)

    def competitor(self, tools: list[Any]) -> Agent:
        return self.build(AgentName.COMPETITOR, tools=tools)

    def gap(self) -> Agent:
        return self.build(AgentName.GAP)

    def strategist(self) -> Agent:
        return self.build(AgentName.STRATEGIST)

    def writer(self) -> Agent:
        return self.build(AgentName.WRITER)

    def evaluator(self) -> Agent:
        return self.build(AgentName.EVALUATOR)
