from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Index, Integer, Numeric, Text, func, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import FlowName, RunStatus, StageName
from app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.db.models.content_job import ContentJob


class WorkflowRun(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "workflow_runs"

    content_job_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("content_jobs.id", ondelete="CASCADE"),
        nullable=False,
    )
    flow: Mapped[FlowName] = mapped_column(
        SAEnum(FlowName, name="flow_name"), nullable=False
    )
    status: Mapped[RunStatus] = mapped_column(
        SAEnum(RunStatus, name="run_status"), default=RunStatus.PENDING, nullable=False
    )
    langfuse_trace_id: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_cost_usd: Mapped[float] = mapped_column(Numeric(10, 5), default=0, nullable=False)
    error: Mapped[str | None] = mapped_column(Text)

    job: Mapped["ContentJob"] = relationship(back_populates="workflow_runs")
    agent_runs: Mapped[list["AgentRun"]] = relationship(
        back_populates="workflow_run", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_wfruns_job", "content_job_id", text("created_at DESC")),)


class AgentRun(UUIDMixin, Base):
    """Immutable log row: created_at only (no updated_at)."""

    __tablename__ = "agent_runs"

    workflow_run_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("workflow_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    agent_name: Mapped[str] = mapped_column(Text, nullable=False)
    stage: Mapped[StageName] = mapped_column(
        SAEnum(StageName, name="stage_name"), nullable=False
    )
    status: Mapped[RunStatus] = mapped_column(
        SAEnum(RunStatus, name="run_status"), default=RunStatus.PENDING, nullable=False
    )
    langfuse_span_id: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cost_usd: Mapped[float] = mapped_column(Numeric(10, 5), default=0, nullable=False)
    retries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    workflow_run: Mapped["WorkflowRun"] = relationship(back_populates="agent_runs")

    __table_args__ = (
        Index("ix_agentruns_wf", "workflow_run_id"),
        Index("ix_agentruns_stage", "stage", "status"),
    )
