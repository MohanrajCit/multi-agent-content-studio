"""RequestProfile — output of the Guard Agent (validation gate)."""
from __future__ import annotations

from pydantic import BaseModel, Field


class RequestProfile(BaseModel):
    """Validated, normalized content request + guard verdict."""

    is_valid: bool = Field(..., description="Whether the request passed validation.")
    rejection_reason: str | None = Field(
        None, description="Why the request was rejected (null if valid)."
    )
    injection_detected: bool = Field(
        False, description="True if a prompt-injection attempt was detected."
    )

    # Normalized request fields (cleaned versions of the user input).
    topic: str = Field(..., description="Normalized content topic.")
    audience: str = Field(..., description="Target audience description.")
    goal: str = Field(..., description="Content goal / desired outcome.")
    tone: str = Field(..., description="Desired tone of voice.")
    platform: str = Field(..., description="Target publishing platform.")

    normalized_keywords: list[str] = Field(
        default_factory=list, description="Seed keywords derived from the topic."
    )
    notes: str | None = Field(
        None, description="Guard observations (ambiguities, assumptions made)."
    )
