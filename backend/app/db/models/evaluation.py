from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Numeric, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.db.models.content_job import ContentJob
    from app.db.models.draft import Draft


class Evaluation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "evaluations"

    content_job_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("content_jobs.id", ondelete="CASCADE"),
        nullable=False,
    )
    draft_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("drafts.id", ondelete="CASCADE"),
        nullable=False,
    )
    seo_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    readability_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    trust_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    audience_match_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    publish_readiness: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)

    job: Mapped["ContentJob"] = relationship(back_populates="evaluations")
    draft: Mapped["Draft"] = relationship(back_populates="evaluations")

    __table_args__ = (
        UniqueConstraint("draft_id", name="uq_eval_per_draft"),
        Index("ix_eval_job", "content_job_id", text("created_at DESC")),
    )
