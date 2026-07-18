"""Phase 4 foundation tests — no live DB/Redis required."""
from __future__ import annotations


def test_settings_load(monkeypatch):
    for key in ["OPENROUTER_API_KEY", "LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY"]:
        monkeypatch.delenv(key, raising=False)

    from app.core.config import Settings
    s = Settings(_env_file=None)
    assert s.app_env == "test"
    assert s.database_url.startswith("postgresql+asyncpg")
    assert s.openrouter_api_key.get_secret_value() == ""
    assert s.langfuse_enabled is False


def test_app_factory_builds():
    from app.main import create_app

    app = create_app()
    paths = set()
    for r in app.routes:
        if hasattr(r, "path"):
            paths.add(r.path)
        elif hasattr(r, "original_router") and hasattr(r.original_router, "routes"):
            prefix = getattr(r.include_context, "prefix", "") if hasattr(r, "include_context") else ""
            for sub_r in r.original_router.routes:
                if hasattr(sub_r, "path"):
                    paths.add(prefix + sub_r.path)
    assert "/health" in paths
    assert "/ready" in paths


def test_error_envelope_shape():
    from app.core.errors import GuardRejectionError, _envelope

    err = GuardRejectionError("nope", details={"field": "topic"})
    assert err.status_code == 400
    assert err.code == "guard_rejected"
    env = _envelope(err.code, err.message, err.details)
    assert env == {
        "error": {
            "code": "guard_rejected",
            "message": "nope",
            "details": {"field": "topic"},
        }
    }


def test_metadata_has_all_tables():
    from app.db.base import Base
    from app.db import models  # noqa: F401

    tables = set(Base.metadata.tables.keys())
    expected = {
        "users", "content_jobs", "research_reports", "competitor_analysis",
        "content_gaps", "strategies", "drafts", "evaluations",
        "workflow_runs", "agent_runs",
    }
    assert expected <= tables


def test_draft_partial_unique_index_defined():
    from app.db.models.draft import Draft

    idx = {i.name: i for i in Draft.__table__.indexes}
    assert "uq_draft_current" in idx
    assert idx["uq_draft_current"].unique is True
