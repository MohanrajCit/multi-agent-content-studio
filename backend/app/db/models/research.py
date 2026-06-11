from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.db.models.content_job import ContentJob


class ResearchReport(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "research_reports"

    content_job_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("content_jobs.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    trend_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    source_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)

    job: Mapped["ContentJob"] = relationship(back_populates="research")


class CompetitorAnalysis(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "competitor_analysis"

    content_job_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("content_jobs.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    competitor_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)

    job: Mapped["ContentJob"] = relationship(back_populates="competitor")
