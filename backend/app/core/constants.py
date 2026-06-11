"""Shared enumerations used across DB models, domain, and API."""
from __future__ import annotations

import enum


class JobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    VALIDATING = "VALIDATING"
    RESEARCHING = "RESEARCHING"
    STRATEGIZING = "STRATEGIZING"
    WRITING = "WRITING"
    EVALUATING = "EVALUATING"
    DONE = "DONE"
    REJECTED = "REJECTED"
    FAILED = "FAILED"


class StageName(str, enum.Enum):
    GUARD = "GUARD"
    RESEARCH = "RESEARCH"
    COMPETITOR = "COMPETITOR"
    GAP = "GAP"
    STRATEGY = "STRATEGY"
    WRITER = "WRITER"
    EVALUATOR = "EVALUATOR"


class DraftOrigin(str, enum.Enum):
    PIPELINE = "PIPELINE"
    SECTION_REGEN = "SECTION_REGEN"
    MANUAL_EDIT = "MANUAL_EDIT"


class RunStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class FlowName(str, enum.Enum):
    CONTENT_INTELLIGENCE = "CONTENT_INTELLIGENCE"
    SECTION_REGENERATION = "SECTION_REGENERATION"


class ExportFormat(str, enum.Enum):
    MARKDOWN = "markdown"
    HTML = "html"
    PDF = "pdf"
    DOCX = "docx"
