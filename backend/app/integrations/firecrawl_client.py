"""Firecrawl API client — extract clean content/markdown from a URL."""
from __future__ import annotations

from pydantic import BaseModel

from app.integrations.base import BaseHTTPClient


class ScrapedPage(BaseModel):
    url: str
    title: str = ""
    markdown: str = ""
    headings: list[str] = []
    success: bool = True


class FirecrawlClient(BaseHTTPClient):
    service_name = "firecrawl"

    def __init__(self, api_key: str, *, base_url: str = "https://api.firecrawl.dev"):
        super().__init__(
            base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=60.0,  # scraping is slow
        )

    async def scrape(self, url: str) -> ScrapedPage:
        data = await self.request_json(
            "POST",
            "/v1/scrape",
            json={"url": url, "formats": ["markdown"], "onlyMainContent": True},
        )
        payload = data.get("data", data)
        md = payload.get("markdown", "") or ""
        meta = payload.get("metadata", {}) or {}
        return ScrapedPage(
            url=url,
            title=meta.get("title", "") or "",
            markdown=md,
            headings=_extract_headings(md),
            success=bool(data.get("success", True)),
        )


def _extract_headings(markdown: str) -> list[str]:
    headings: list[str] = []
    for line in markdown.splitlines():
        stripped = line.lstrip()
        if stripped.startswith("#"):
            text = stripped.lstrip("#").strip()
            if text:
                headings.append(text)
    return headings
