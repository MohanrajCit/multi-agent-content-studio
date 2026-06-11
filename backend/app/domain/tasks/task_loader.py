"""Loads externalized task definitions from tasks.yaml."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import BaseModel

_TASKS_PATH = Path(__file__).parent / "prompts" / "tasks.yaml"


class TaskSpec(BaseModel):
    description: str
    expected_output: str


@lru_cache(maxsize=1)
def _load_all() -> dict[str, TaskSpec]:
    raw = yaml.safe_load(_TASKS_PATH.read_text(encoding="utf-8"))
    return {key: TaskSpec(**val) for key, val in raw.items()}


def get_task_spec(task_key: str) -> TaskSpec:
    specs = _load_all()
    if task_key not in specs:
        raise KeyError(f"No task spec defined for '{task_key}'")
    return specs[task_key]
