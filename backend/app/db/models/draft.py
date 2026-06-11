from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Index, Integer, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import DraftOrigin
from app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.db.models.content_job import ContentJob
    from app.db.models.evaluation import Evaluation


class Draft(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "drafts"

    content_job_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("content_jobs.id", ondelete="CASCADE"),
        nullable=False,
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    parent_version: Mapped[int | None] = mapped_column(Integer)
    origin: Mapped[DraftOrigin] = mapped_column(
        SAEnum(DraftOrigin, name="draft_origin"),
        default=DraftOrigin.PIPELINE,
        nullable=False,
    )
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    title: Mapped[str | None] = mapped_column(Text)
    word_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sections: Mapped[list] = mapped_column(JSONB, nullable=False)
    regen_section_id: Mapped[str | None] = mapped_column(Text)
    regen_instruction: Mapped[str | None] = mapped_column(Text)

    job: Mapped["ContentJob"] = relationship(
        back_populates="drafts", foreign_keys=[content_job_id]
    )
    evaluations: Mapped[list["Evaluation"]] = relationship(
        back_populates="draft", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("content_job_id", "version", name="uq_draft_version"),
        Index(
            "uq_draft_current",
            "content_job_id",
            unique=True,
            postgresql_where=text("is_current"),
        ),
        Index("ix_drafts_job_version", "content_job_id", text("version DESC")),
    )
