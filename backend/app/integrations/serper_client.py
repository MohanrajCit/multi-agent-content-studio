"""Serper API client — Google search results (organic, PAA, related)."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.integrations.base import BaseHTTPClient


class SerperOrganic(BaseModel):
    title: str = ""
    link: str = ""
    snippet: str = ""
    position: int | None = None


class SerperResult(BaseModel):
    organic: list[SerperOrganic] = []
    people_also_ask: list[str] = []
    related_searches: list[str] = []
    raw: dict[str, Any] = {}


class SerperClient(BaseHTTPClient):
    service_name = "serper"

    def __init__(self, api_key: str, *, base_url: str = "https://google.serper.dev"):
        super().__init__(
            base_url,
            headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
            timeout=20.0,
        )

    async def search(self, query: str, *, num: int = 10, gl: str = "us") -> SerperResult:
        data = await self.request_json(
            "POST", "/search", json={"q": query, "num": num, "gl": gl}
        )
        organic = [SerperOrganic(**o) for o in data.get("organic", [])]
        paa = [q.get("question", "") for q in data.get("peopleAlsoAsk", []) if q.get("question")]
        related = [
            r.get("query", "") for r in data.get("relatedSearches", []) if r.get("query")
        ]
        return SerperResult(
            organic=organic,
            people_also_ask=paa,
            related_searches=related,
            raw=data,
        )
