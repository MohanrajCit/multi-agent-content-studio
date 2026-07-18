"""Phase 5 integration-client tests (httpx mocked via respx; no live calls)."""
from __future__ import annotations

import httpx
import pytest
import respx
import tenacity

from app.core.errors import ExternalServiceError
from app.integrations.firecrawl_client import FirecrawlClient
from app.integrations.openrouter_client import OpenRouterClient
from app.integrations.serper_client import SerperClient
from app.integrations.retry import RETRY_KWARGS

# Speed up retries during unit tests by making wait time 0
RETRY_KWARGS["wait"] = tenacity.wait_fixed(0)


@respx.mock
async def test_serper_parses_organic_paa_related():
    respx.post("https://google.serper.dev/search").mock(
        return_value=httpx.Response(
            200,
            json={
                "organic": [{"title": "T", "link": "http://x", "snippet": "s", "position": 1}],
                "peopleAlsoAsk": [{"question": "Why?"}],
                "relatedSearches": [{"query": "related thing"}],
            },
        )
    )
    client = SerperClient(api_key="k")
    res = await client.search("topic")
    await client.aclose()

    assert res.organic[0].title == "T"
    assert res.people_also_ask == ["Why?"]
    assert res.related_searches == ["related thing"]


@respx.mock
async def test_firecrawl_extracts_headings():
    respx.post("https://api.firecrawl.dev/v1/scrape").mock(
        return_value=httpx.Response(
            200,
            json={
                "success": True,
                "data": {
                    "markdown": "# Title\n\ntext\n\n## Section A\n\n## Section B",
                    "metadata": {"title": "Title"},
                },
            },
        )
    )
    client = FirecrawlClient(api_key="k")
    page = await client.scrape("http://example.com")
    await client.aclose()

    assert page.title == "Title"
    assert page.headings == ["Title", "Section A", "Section B"]


@respx.mock
async def test_openrouter_returns_text_and_usage():
    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=httpx.Response(
            200,
            json={
                "model": "anthropic/claude-opus-4",
                "choices": [{"message": {"content": "hello"}}],
                "usage": {"prompt_tokens": 5, "completion_tokens": 3, "total_tokens": 8},
            },
        )
    )
    client = OpenRouterClient(api_key="k")
    res = await client.complete([{"role": "user", "content": "hi"}])
    await client.aclose()

    assert res.text == "hello"
    assert res.usage.total_tokens == 8


@respx.mock
async def test_4xx_is_not_retried():
    route = respx.post("https://google.serper.dev/search").mock(
        return_value=httpx.Response(401, json={"message": "bad key"})
    )
    client = SerperClient(api_key="bad")
    with pytest.raises(ExternalServiceError):
        await client.search("x")
    await client.aclose()
    assert route.call_count == 1  # no retries on client error


@respx.mock
async def test_5xx_retries_then_raises():
    route = respx.post("https://google.serper.dev/search").mock(
        return_value=httpx.Response(503, text="upstream down")
    )
    client = SerperClient(api_key="k")
    with pytest.raises(ExternalServiceError):
        await client.search("x")
    await client.aclose()
    assert route.call_count == 6  # stop_after_attempt(6)


@respx.mock
async def test_429_is_retried_as_transient():
    route = respx.post("https://google.serper.dev/search").mock(
        return_value=httpx.Response(429, text="rate limited")
    )
    client = SerperClient(api_key="k")
    with pytest.raises(ExternalServiceError):
        await client.search("x")
    await client.aclose()
    assert route.call_count == 6  # 429 retried with backoff, then raised


def test_langfuse_noop_when_disabled(monkeypatch):
    for key in ["LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY"]:
        monkeypatch.delenv(key, raising=False)

    from app.core.config import Settings
    from app.integrations.langfuse_tracer import LangfuseTracer

    s = Settings(_env_file=None)
    tracer = LangfuseTracer(s)
    assert tracer.enabled is False
    trace = tracer.trace("t")
    with tracer.span(trace, "s") as span:
        span.update(foo="bar")  # must not raise
    tracer.flush()
