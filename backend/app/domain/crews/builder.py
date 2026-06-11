"""Builds the four mandated crews from the agent + task factories.

Research Crew  : Research Agent + Competitor Agent   (market + competitor intel)
Strategy Crew  : Content Gap Agent + Strategist Agent (opportunity + planning)
Content Crew   : Writer Agent                          (draft generation)
Quality Crew   : Evaluator Agent                       (publish-readiness scoring)

Guard runs as a single-agent crew used by the flow's validation gate.
"""
from __future__ import annotations

from typing import Any

from crewai import Crew, Process

from app.domain.agents import AgentFactory
from app.domain.tasks import TaskFactory, TaskName


class CrewBuilder:
    def __init__(
        self,
        agents: AgentFactory,
        tasks: TaskFactory,
        *,
        serper_tool: Any,
        firecrawl_tool: Any,
    ) -> None:
        self._agents = agents
        self._tasks = tasks
        self._serper = serper_tool
        self._firecrawl = firecrawl_tool

    def _crew(self, tasks: list, agents: list) -> Crew:
        return Crew(
            agents=agents,
            tasks=tasks,
            process=Process.sequential,
            verbose=False,
        )

    def guard_crew(self) -> Crew:
        agent = self._agents.guard()
        task = self._tasks.build(TaskName.GUARD, agent)
        return self._crew([task], [agent])

    def research_crew(self) -> Crew:
        research_agent = self._agents.research(tools=[self._serper])
        competitor_agent = self._agents.competitor(
            tools=[self._serper, self._firecrawl]
        )
        research_task = self._tasks.build(TaskName.RESEARCH, research_agent)
        competitor_task = self._tasks.build(
            TaskName.COMPETITOR, competitor_agent, context=[research_task]
        )
        return self._crew(
            [research_task, competitor_task], [research_agent, competitor_agent]
        )

    def strategy_crew(self) -> Crew:
        gap_agent = self._agents.gap()
        strategist_agent = self._agents.strategist()
        gap_task = self._tasks.build(TaskName.GAP, gap_agent)
        strategist_task = self._tasks.build(
            TaskName.STRATEGIST, strategist_agent, context=[gap_task]
        )
        return self._crew(
            [gap_task, strategist_task], [gap_agent, strategist_agent]
        )

    def content_crew(self) -> Crew:
        writer_agent = self._agents.writer()
        writer_task = self._tasks.build(TaskName.WRITER, writer_agent)
        return self._crew([writer_task], [writer_agent])

    def quality_crew(self) -> Crew:
        evaluator_agent = self._agents.evaluator()
        evaluator_task = self._tasks.build(TaskName.EVALUATOR, evaluator_agent)
        return self._crew([evaluator_task], [evaluator_agent])
