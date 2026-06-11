"""CrewAI tool wrapping FirecrawlClient (content extraction)."""
from __future__ import annotations

import json
from typing import Any

from crewai.tools import BaseTool
from pydantic import BaseModel, Field

from app.integrations.firecrawl_client import FirecrawlClient
from app.tools._bridge import run_sync


class FirecrawlScrapeInput(BaseModel):
    url: str = Field(..., description="The URL to scrape for clean content.")


class FirecrawlScrapeTool(BaseTool):
    name: str = "scrape_page"
    description: str = (
        "Extract clean main content from a web page URL. Returns the page title, "
        "markdown content, and the list of headings as JSON."
    )
    args_schema: type[BaseModel] = FirecrawlScrapeInput

    def __init__(self, client: FirecrawlClient, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        object.__setattr__(self, "_client", client)

    def _run(self, url: str) -> str:
        client: FirecrawlClient = object.__getattribute__(self, "_client")
        page = run_sync(client.scrape(url))
        return json.dumps(
            {
                "url": page.url,
                "title": page.title,
                "headings": page.headings,
                "markdown": page.markdown[:8000],  # cap context size
            }
        )
