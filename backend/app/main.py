"""FastAPI application factory.

`create_app()` builds an isolated app instance (testable, no import-time side
effects). The lifespan context initializes and disposes the DB engine and Redis
pool deterministically.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.middleware import RequestContextMiddleware
from app.api.routers import health, jobs
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.core.redis import dispose_redis, init_redis
from app.db.session import dispose_engine, init_engine

logger = get_logger("app")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(level=settings.log_level, json_logs=settings.log_json)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        logger.info("startup", env=settings.app_env)
        init_engine(settings)
        init_redis(settings)
        yield
        await dispose_redis()
        await dispose_engine()
        logger.info("shutdown")

    app = FastAPI(
        title="AI Content Intelligence Studio",
        version="0.1.0",
        debug=settings.app_debug,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if not settings.is_production else [],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestContextMiddleware)

    register_exception_handlers(app)

    app.include_router(health.router)
    app.include_router(jobs.router)
    # Phase 9 routers (jobs, drafts, insights, exports) mount here.

    return app


app = create_app()
