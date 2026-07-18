"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import { isActive } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import type {
  JobCreateRequest,
  SectionRegenRequest,
} from "@/lib/types";

export function useJobs() {
  return useQuery({
    queryKey: queryKeys.jobs,
    queryFn: api.listJobs,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((j) => isActive(j.status)) ? 1000 : false,
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: queryKeys.job(id),
    queryFn: () => api.getJob(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useJobStatus(id: string, opts?: { live?: boolean }) {
  return useQuery({
    queryKey: queryKeys.status(id),
    queryFn: () => api.getStatus(id),
    enabled: !!id,
    refetchInterval: (query) =>
      opts?.live && query.state.data && isActive(query.state.data.status)
        ? 1000
        : false,
  });
}

export function useJobResults(id: string) {
  return useQuery({
    queryKey: queryKeys.results(id),
    queryFn: () => api.getResults(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useDrafts(id: string) {
  return useQuery({
    queryKey: queryKeys.drafts(id),
    queryFn: () => api.listDrafts(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useDraft(id: string, version: number | null) {
  return useQuery({
    queryKey: queryKeys.draft(id, version ?? -1),
    queryFn: () => api.getDraft(id, version as number),
    enabled: !!id && version != null && version > 0,
    staleTime: 60_000,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: JobCreateRequest) => api.createJob(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.jobs }),
  });
}

export function useRegenerateSection(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      version,
      body,
    }: {
      version: number;
      body: SectionRegenRequest;
    }) => api.regenerateSection(jobId, version, body),
    onSuccess: () => invalidateJob(qc, jobId),
  });
}

export function useRestoreVersion(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (version: number) => api.restoreVersion(jobId, version),
    onSuccess: () => invalidateJob(qc, jobId),
  });
}

function invalidateJob(
  qc: ReturnType<typeof useQueryClient>,
  jobId: string,
) {
  qc.invalidateQueries({ queryKey: queryKeys.drafts(jobId) });
  qc.invalidateQueries({ queryKey: queryKeys.results(jobId) });
  qc.invalidateQueries({ queryKey: queryKeys.job(jobId) });
  qc.invalidateQueries({ queryKey: queryKeys.jobs });
}
