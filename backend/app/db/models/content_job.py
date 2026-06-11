from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Index, Numeric, Text, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import JobStatus
from app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.db.models.draft import Draft
    from app.db.models.evaluation import Evaluation
    from app.db.models.research import CompetitorAnalysis, ResearchReport
    from app.db.models.run import WorkflowRun
    from app.db.models.strategy import ContentGap, Strategy
    from app.db.models.user import User


class ContentJob(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "content_jobs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    topic: Mapped[str] = mapped_column(Text, nullable=False)
    audience: Mapped[str] = mapped_column(Text, nullable=False)
    goal: Mapped[str] = mapped_column(Text, nullable=False)
    tone: Mapped[str] = mapped_column(Text, nullable=False)
    platform: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[JobStatus] = mapped_column(
        SAEnum(JobStatus, name="job_status"), default=JobStatus.QUEUED, nullable=False
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    publish_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    current_draft_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(
            "drafts.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_jobs_current_draft",
        ),
    )

    user: Mapped["User"] = relationship(back_populates="jobs")
    research: Mapped["ResearchReport | None"] = relationship(
        back_populates="job", cascade="all, delete-orphan", uselist=False
    )
    competitor: Mapped["CompetitorAnalysis | None"] = relationship(
        back_populates="job", cascade="all, delete-orphan", uselist=False
    )
    gaps: Mapped["ContentGap | None"] = relationship(
        back_populates="job", cascade="all, delete-orphan", uselist=False
    )
    strategy: Mapped["Strategy | None"] = relationship(
        back_populates="job", cascade="all, delete-orphan", uselist=False
    )
    drafts: Mapped[list["Draft"]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
        primaryjoin="ContentJob.id == Draft.content_job_id",
        foreign_keys="Draft.content_job_id",
    )
    evaluations: Mapped[list["Evaluation"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )
    workflow_runs: Mapped[list["WorkflowRun"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_jobs_user_created", "user_id", text("created_at DESC")),
        Index("ix_jobs_status", "status"),
    )
