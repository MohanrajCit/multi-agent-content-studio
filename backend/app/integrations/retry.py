"""Shared retry/backoff policy for external HTTP clients.

Retries ONLY transient failures (connect errors, timeouts, 5xx). 4xx responses
(bad key, bad params) are not retried — they will not succeed on repeat and
retrying wastes quota.
"""
from __future__ import annotations

import httpx
from tenacity import (
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)


class TransientHTTPError(Exception):
    """Raised for a retryable upstream status (5xx)."""

    def __init__(self, status_code: int, body: str):
        super().__init__(f"transient upstream status {status_code}")
        self.status_code = status_code
        self.body = body


def _is_retryable(exc: BaseException) -> bool:
    if isinstance(exc, (httpx.TimeoutException, httpx.TransportError)):
        return True
    if isinstance(exc, TransientHTTPError):
        return True
    return False


# Reusable kwargs for tenacity's @retry / AsyncRetrying.
RETRY_KWARGS = dict(
    retry=retry_if_exception(_is_retryable),
    wait=wait_exponential(multiplier=2, min=5, max=30),
    stop=stop_after_attempt(6),
    reraise=True,
)
