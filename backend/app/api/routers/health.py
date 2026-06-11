"""Liveness and readiness probes.

/health  — process is up (no dependency checks; cheap, for liveness).
/ready   — dependencies reachable (DB + Redis; for readiness gating).
"""
from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import RedisDep, SessionDep

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.get("/ready")
async def ready(session: SessionDep, redis: RedisDep) -> dict:
    checks: dict[str, str] = {}
    status = "ok"

    try:
        await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["database"] = f"error: {exc}"
        status = "degraded"

    try:
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["redis"] = f"error: {exc}"
        status = "degraded"

    return {"status": status, "checks": checks}
