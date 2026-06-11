"""Runtime wiring for the production JobService.

This is the single place that assembles the real, LLM-backed pipeline: provider
LLM → agents → tasks → crews → runner → service. It is constructed lazily and
cached, so importing the app never touches the network and tests (which override
the `get_job_service` dependency with a fake-runner service) never hit it.
"""
from __future__ import annotations

from functools import lru_cache

from app.core.config import Settings, get_settings
from app.domain.agents.factory import AgentFactory
from app.domain.crews import CrewBuilder
from app.domain.flows.runner import CrewPipelineRunner
from app.domain.llm.provider import build_llm
from app.domain.tasks.factory import TaskFactory
from app.integrations.firecrawl_client import FirecrawlClient
from app.integrations.serper_client import SerperClient
from app.services.job_service import JobService
from app.tools import FirecrawlScrapeTool, SerperSearchTool


def build_runtime_job_service(settings: Settings) -> JobService:
    """Assemble the LLM-backed JobService from settings."""
    llm = build_llm(settings)
    agents = AgentFactory(llm)
    tasks = TaskFactory()

    serper_tool = SerperSearchTool(
        SerperClient(settings.serper_api_key.get_secret_value())
    )
    firecrawl_tool = FirecrawlScrapeTool(
        FirecrawlClient(settings.firecrawl_api_key.get_secret_value())
    )

    builder = CrewBuilder(
        agents, tasks, serper_tool=serper_tool, firecrawl_tool=firecrawl_tool
    )
    return JobService(CrewPipelineRunner(builder))


@lru_cache(maxsize=1)
def get_runtime_job_service() -> JobService:
    """Process-wide singleton JobService for live requests."""
    return build_runtime_job_service(get_settings())
