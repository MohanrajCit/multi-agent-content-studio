"use client";

import { useEffect, useRef, useState, useCallback, createContext, useContext, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { JobStatus, StageEvent } from "@/lib/types";

export interface JobEventsState {
  events: StageEvent[];
  connected: boolean;
  done: boolean;
  finalStatus: JobStatus | null;
  error: string | null;
}

interface DonePayload {
  id: string;
  status: JobStatus;
  publish_score: number | null;
}

export const JobEventsContext = createContext<JobEventsState | null>(null);

export function useSharedJobEvents() {
  const ctx = useContext(JobEventsContext);
  if (!ctx) throw new Error("Missing JobEventsContext");
  return ctx;
}

/**
 * Subscribe to a job's SSE stream. Accumulates `stage` events in order and
 * resolves on the terminal `done` frame, then refreshes the cached job views.
 *
 * `enabled` lets callers gate the connection (e.g. only stream active jobs).
 */
export function useJobEvents(
  jobId: string,
  enabled = true,
): JobEventsState {
  const qc = useQueryClient();
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [done, setDone] = useState(false);
  const [finalStatus, setFinalStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<Set<number>>(new Set());

  // Stable callback for invalidation to avoid dependency churn
  const invalidateAll = useCallback(
    (id: string) => {
      qc.invalidateQueries({ queryKey: queryKeys.status(id) });
      qc.invalidateQueries({ queryKey: queryKeys.results(id) });
      qc.invalidateQueries({ queryKey: queryKeys.drafts(id) });
      qc.invalidateQueries({ queryKey: queryKeys.job(id) });
    },
    [qc],
  );

  useEffect(() => {
    if (!jobId || !enabled || typeof window === "undefined") return;

    seen.current = new Set();
    setEvents([]);
    setDone(false);
    setFinalStatus(null);
    setError(null);

    const source = new EventSource(api.eventsUrl(jobId));

    source.addEventListener("open", () => setConnected(true));

    source.addEventListener("stage", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as StageEvent;
        if (seen.current.has(data.seq)) return;
        seen.current.add(data.seq);
        setEvents((prev) => [...prev, data]);
      } catch {
        /* ignore malformed frame */
      }
    });

    source.addEventListener("done", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as DonePayload;
        setFinalStatus(data.status);
      } catch {
        /* ignore */
      }
      setDone(true);
      setConnected(false);
      source.close();
      // Pull fresh authoritative state now that the run finished.
      invalidateAll(jobId);
    });

    source.addEventListener("error", () => {
      // EventSource auto-reconnects; surface only if we never completed.
      setConnected(false);
      setError("Connection lost. Retrying…");
    });

    return () => source.close();
  }, [jobId, enabled, invalidateAll]);

  return useMemo(
    () => ({ events, connected, done, finalStatus, error }),
    [events, connected, done, finalStatus, error]
  );
}
