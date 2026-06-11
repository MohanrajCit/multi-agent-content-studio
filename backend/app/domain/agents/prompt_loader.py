"""Loads externalized agent prompts from agents.yaml (req 3)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import BaseModel

_PROMPTS_PATH = Path(__file__).parent / "prompts" / "agents.yaml"


class AgentPrompt(BaseModel):
    role: str
    goal: str
    backstory: str


@lru_cache(maxsize=1)
def _load_all() -> dict[str, AgentPrompt]:
    raw = yaml.safe_load(_PROMPTS_PATH.read_text(encoding="utf-8"))
    return {key: AgentPrompt(**val) for key, val in raw.items()}


def get_prompt(agent_key: str) -> AgentPrompt:
    prompts = _load_all()
    if agent_key not in prompts:
        raise KeyError(f"No prompt defined for agent '{agent_key}'")
    return prompts[agent_key]
