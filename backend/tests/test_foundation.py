"""Phase 4 foundation tests — no live DB/Redis required."""
from __future__ import annotations


def test_settings_load(settings):
    assert settings.app_env == "test"
    assert settings.database_url.startswith("postgresql+asyncpg")
    # secrets default to empty SecretStr, not None
    assert settings.openrouter_api_key.get_secret_value() == ""
    assert settings.langfuse_enabled is False


def test_app_factory_builds():
    from app.main import create_app

    app = create_app()
    routes = {r.path for r in app.routes}
    assert "/health" in routes
    assert "/ready" in routes


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
