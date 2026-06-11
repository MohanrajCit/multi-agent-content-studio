"""Phase 7 tool-wrapper tests (mocked clients via respx; no live calls)."""
from __future__ import annotations

import json

import httpx
import respx

from app.integrations.firecrawl_client import FirecrawlClient
from app.integrations.serper_client import SerperClient
from app.tools import FirecrawlScrapeTool, SerperSearchTool


@respx.mock
def test_serper_tool_returns_json():
    respx.post("https://google.serper.dev/search").mock(
        return_value=httpx.Response(
            200,
            json={
                "organic": [{"title": "T", "link": "http://x", "snippet": "s"}],
                "peopleAlsoAsk": [{"question": "Why?"}],
                "relatedSearches": [{"query": "rel"}],
            },
        )
    )
    tool = SerperSearchTool(SerperClient(api_key="k"))
    out = json.loads(tool._run(query="topic", num=3))
    assert out["organic"][0]["title"] == "T"
    assert out["people_also_ask"] == ["Why?"]
    assert out["related_searches"] == ["rel"]
    assert tool.name == "google_search"


@respx.mock
def test_firecrawl_tool_returns_json():
    respx.post("https://api.firecrawl.dev/v1/scrape").mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "data": {"markdown": "# H1\n\n## H2", "metadata": {"title": "Title"}},
            },
        )
    )
    tool = FirecrawlScrapeTool(FirecrawlClient(api_key="k"))
    out = json.loads(tool._run(url="http://example.com"))
    assert out["title"] == "Title"
    assert out["headings"] == ["H1", "H2"]
    assert tool.name == "scrape_page"
