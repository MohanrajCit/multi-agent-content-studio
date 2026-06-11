"""Provider-agnostic CrewAI LLM adapter.

Wraps any CompletionClient (OpenRouter, Gemini, …) behind CrewAI's synchronous
BaseLLM.call(). The async client is driven from sync code via a persistent
background event loop. Emits a Langfuse generation span per call (req 5) and
returns a parsed Pydantic instance when CrewAI passes a response_model (req 2).

Agents/tasks/crews/flows only ever see a BaseLLM — they never know which
provider backs it (req 4).
"""
from __future__ import annotations

import asyncio
import json
import threading
from typing import Any

from pydantic import BaseModel

from app.core.logging import get_logger
from app.integrations.langfuse_tracer import LangfuseTracer
from app.integrations.types import CompletionClient

logger = get_logger("crew_llm")


class _LoopThread:
    """A persistent background event loop to run coroutines from sync code."""

    def __init__(self) -> None:
        self._loop = asyncio.new_event_loop()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self) -> None:
        asyncio.set_event_loop(self._loop)
        self._loop.run_forever()

    def run(self, coro) -> Any:
        future = asyncio.run_coroutine_threadsafe(coro, self._loop)
        return future.result()


_loop_thread: _LoopThread | None = None


def _get_loop_thread() -> _LoopThread:
    global _loop_thread
    if _loop_thread is None:
        _loop_thread = _LoopThread()
    return _loop_thread


try:
    from crewai.llms.base_llm import BaseLLM
except Exception:  # pragma: no cover - import guard for environments w/o crewai
    BaseLLM = object  # type: ignore[assignment,misc]


class CrewCompletionLLM(BaseLLM):  # type: ignore[misc]
    """Routes CrewAI agent calls through any CompletionClient."""

    def __init__(
        self,
        client: CompletionClient,
        *,
        model: str,
        provider: str = "openrouter",
        tracer: LangfuseTracer | None = None,
        temperature: float = 0.7,
        langfuse_trace: Any | None = None,
        agent_name: str = "agent",
        **kwargs: Any,
    ) -> None:
        try:
            super().__init__(model=model, temperature=temperature, **kwargs)
        except Exception:
            # Fallback if BaseLLM is the object stub (crewai absent in tests).
            self.model = model  # type: ignore[attr-defined]
            self.temperature = temperature  # type: ignore[attr-defined]
        object.__setattr__(self, "_client", client)
        object.__setattr__(self, "_provider", provider)
        object.__setattr__(self, "_tracer", tracer)
        object.__setattr__(self, "_lf_trace", langfuse_trace)
        object.__setattr__(self, "_agent_name", agent_name)

    @property
    def provider_name(self) -> str:
        return object.__getattribute__(self, "_provider")

    def _normalize_messages(self, messages: Any) -> list[dict[str, str]]:
        if isinstance(messages, str):
            return [{"role": "user", "content": messages}]
        norm: list[dict[str, str]] = []
        for m in messages:
            if isinstance(m, dict):
                norm.append(
                    {"role": m.get("role", "user"), "content": str(m.get("content", ""))}
                )
            else:
                norm.append({"role": "user", "content": str(m)})
        return norm

    def call(  # type: ignore[override]
        self,
        messages: Any,
        tools: Any = None,
        callbacks: Any = None,
        available_functions: Any = None,
        from_task: Any = None,
        from_agent: Any = None,
        response_model: type[BaseModel] | None = None,
    ) -> str | Any:
        norm = self._normalize_messages(messages)
        response_format = None
        if response_model is not None:
            response_format = {"type": "json_object"}
            if norm:
                norm[-1]["content"] += "\n\nYou MUST return a valid JSON object."

        client: CompletionClient = object.__getattribute__(self, "_client")
        tracer: LangfuseTracer | None = object.__getattribute__(self, "_tracer")
        lf_trace = object.__getattribute__(self, "_lf_trace")
        agent_name = object.__getattribute__(self, "_agent_name")

        result = _get_loop_thread().run(
            client.complete(
                norm,
                model=self.model,
                temperature=getattr(self, "temperature", 0.7),
                response_format=response_format,
            )
        )

        if tracer is not None and tracer.enabled and lf_trace is not None:
            try:
                gen = lf_trace.generation(
                    name=f"llm:{agent_name}",
                    model=result.model,
                    usage={
                        "input": result.usage.prompt_tokens,
                        "output": result.usage.completion_tokens,
                        "total": result.usage.total_tokens,
                    },
                )
                gen.end(output=result.text[:2000])
            except Exception as exc:  # noqa: BLE001
                logger.warning("langfuse_generation_failed", error=str(exc))

        if response_model is not None:
            return self._parse_structured(result.text, response_model)
        return result.text

    @staticmethod
    def _parse_structured(text: str, model: type[BaseModel]) -> BaseModel:
        return model.model_validate(_extract_json(text))

    def supports_function_calling(self) -> bool:
        return False


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip().rstrip("`").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start : end + 1])
        raise
