"""CrewAI tool wrapping SerperClient (Google search)."""
from __future__ import annotations

import json
from typing import Any

from crewai.tools import BaseTool
from pydantic import BaseModel, Field

from app.integrations.serper_client import SerperClient
from app.tools._bridge import run_sync


class SerperSearchInput(BaseModel):
    query: str = Field(..., description="The search query to run on Google.")
    num: int = Field(10, description="Number of organic results to return.")


class SerperSearchTool(BaseTool):
    name: str = "google_search"
    description: str = (
        "Search Google for a query. Returns organic results (title, link, snippet), "
        "People-Also-Ask questions, and related searches as JSON."
    )
    args_schema: type[BaseModel] = SerperSearchInput

    def __init__(self, client: SerperClient, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        object.__setattr__(self, "_client", client)

    def _run(self, query: str, num: int = 10) -> str:
        client: SerperClient = object.__getattribute__(self, "_client")
        result = run_sync(client.search(query, num=num))
        return json.dumps(
            {
                "organic": [o.model_dump() for o in result.organic],
                "people_also_ask": result.people_also_ask,
                "related_searches": result.related_searches,
            }
        )
