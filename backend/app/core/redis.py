"""Redis connection pool (ARQ broker + SSE pub/sub bus)."""
from __future__ import annotations

from redis.asyncio import Redis

from app.core.config import Settings

_redis: Redis | None = None


def init_redis(settings: Settings) -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def dispose_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


def get_redis() -> Redis:
    if _redis is None:
        raise RuntimeError("Redis not initialized; call init_redis() in lifespan.")
    return _redis
