"""FastAPI dependency providers (the DI seam).

These functions are the single place where the framework wires concrete
implementations into the request. Tests override them via
`app.dependency_overrides` to inject fakes.
"""
from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.errors import NotFoundError
from app.core.redis import get_redis
from app.db.models.user import User
from app.db.session import get_session
from app.services.job_service import JobService


async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_session():
        yield session


def redis_client() -> Redis:
    return get_redis()


def settings_dep() -> Settings:
    return get_settings()


def get_job_service() -> JobService:
    """Provide the process-wide JobService.

    Default is the live, LLM-backed orchestrator (lazily built). Tests override
    this with a fake-runner JobService via `app.dependency_overrides`.
    """
    from app.services.wiring import get_runtime_job_service

    return get_runtime_job_service()


SessionDep = Annotated[AsyncSession, Depends(db_session)]
RedisDep = Annotated[Redis, Depends(redis_client)]
SettingsDep = Annotated[Settings, Depends(settings_dep)]
JobServiceDep = Annotated[JobService, Depends(get_job_service)]


async def get_current_user(
    session: SessionDep, settings: SettingsDep
) -> User:
    """Single-tenant: resolve the seeded default user.

    Swapping this for JWT auth later is a one-function change; every route
    already depends on `CurrentUser`.
    """
    result = await session.execute(
        select(User).where(User.email == settings.default_user_email)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError("Default user not seeded; run migrations/seed.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
