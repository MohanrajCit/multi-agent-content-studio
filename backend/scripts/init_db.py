"""Local bootstrap: create the schema and seed the single-tenant default user.

Runtime-only helper for running the project locally without Docker/Alembic.
Uses the ASYNC engine (asyncpg) so it needs no extra sync driver. Idempotent:
`create_all` skips existing tables and the user is only inserted if missing.

    python scripts/init_db.py
"""
from __future__ import annotations

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.db import models  # noqa: F401 — import side-effect: register all tables
from app.db.base import Base
from app.db.models.user import User


async def main() -> None:
    settings = get_settings()
    print(f"→ connecting: {settings.database_url}")
    engine = create_async_engine(settings.database_url)

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print(f"✓ schema ready ({len(Base.metadata.tables)} tables)")

        maker = async_sessionmaker(engine, expire_on_commit=False)
        async with maker() as session:
            existing = await session.scalar(
                select(User).where(User.email == settings.default_user_email)
            )
            if existing is None:
                session.add(
                    User(
                        email=settings.default_user_email,
                        name=settings.default_user_name,
                    )
                )
                await session.commit()
                print(f"✓ seeded default user: {settings.default_user_email}")
            else:
                print(f"✓ default user already present: {settings.default_user_email}")
    finally:
        await engine.dispose()

    print("✓ done")


if __name__ == "__main__":
    asyncio.run(main())
