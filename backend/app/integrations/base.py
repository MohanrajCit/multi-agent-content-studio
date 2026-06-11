"""Base async HTTP client with shared retry, timeout, and error mapping."""
from __future__ import annotations

from typing import Any

import httpx
from tenacity import AsyncRetrying

from app.core.errors import ExternalServiceError
from app.core.logging import get_logger
from app.integrations.retry import RETRY_KWARGS, TransientHTTPError

logger = get_logger("integrations")


class BaseHTTPClient:
    """Wraps one httpx.AsyncClient with retry + uniform error handling.

    Subclasses set `service_name`, `base_url`, and default headers. Construct
    once (in the DI container / worker startup) and reuse across requests.
    """

    service_name: str = "external"

    def __init__(
        self,
        base_url: str,
        *,
        headers: dict[str, str] | None = None,
        timeout: float = 30.0,
    ) -> None:
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers=headers or {},
            timeout=httpx.Timeout(timeout),
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        await self.aclose()

    async def request_json(
        self,
        method: str,
        url: str,
        *,
        json: Any | None = None,
        params: dict | None = None,
    ) -> dict:
        """Perform a JSON request with retry on transient failures."""
        try:
            async for attempt in AsyncRetrying(**RETRY_KWARGS):
                with attempt:
                    resp = await self._client.request(
                        method, url, json=json, params=params
                    )
                    if resp.status_code >= 500 or resp.status_code == 429:
                        # 5xx and 429 (rate limit) are transient → retry w/ backoff.
                        raise TransientHTTPError(resp.status_code, resp.text)
                    if resp.status_code >= 400:
                        # Non-retryable client error — fail immediately.
                        raise ExternalServiceError(
                            f"{self.service_name} returned {resp.status_code}",
                            details=_safe_body(resp),
                        )
                    return resp.json()
        except ExternalServiceError:
            raise
        except TransientHTTPError as exc:
            logger.error(
                "external_service_exhausted",
                service=self.service_name,
                status=exc.status_code,
            )
            raise ExternalServiceError(
                f"{self.service_name} failed after retries (status {exc.status_code})",
            ) from exc
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            logger.error("external_service_unreachable", service=self.service_name,
                         error=str(exc))
            raise ExternalServiceError(
                f"{self.service_name} unreachable: {exc}"
            ) from exc
        raise ExternalServiceError(f"{self.service_name}: no response")  # pragma: no cover


def _safe_body(resp: httpx.Response) -> Any:
    try:
        return resp.json()
    except Exception:  # noqa: BLE001
        return resp.text[:500]
