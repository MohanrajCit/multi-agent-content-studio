import type {
  DraftDetail,
  DraftSummary,
  Job,
  JobCreateRequest,
  JobResults,
  JobStatusView,
  SectionRegenRequest,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Error carrying the backend's structured envelope (if present). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (cause) {
    throw new ApiError(0, "network_error", "Could not reach the API.", cause);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const env = body?.error;
    throw new ApiError(
      res.status,
      env?.code ?? "http_error",
      env?.message ?? res.statusText,
      env?.details,
    );
  }
  return body as T;
}

export const api = {
  listJobs: () => request<Job[]>("/jobs"),
  getJob: (id: string) => request<Job>(`/jobs/${id}`),
  createJob: (body: JobCreateRequest) =>
    request<Job>("/jobs", { method: "POST", body: JSON.stringify(body) }),
  getStatus: (id: string) => request<JobStatusView>(`/jobs/${id}/status`),
  getResults: (id: string) => request<JobResults>(`/jobs/${id}/results`),
  listDrafts: (id: string) => request<DraftSummary[]>(`/jobs/${id}/drafts`),
  getDraft: (id: string, version: number) =>
    request<DraftDetail>(`/jobs/${id}/drafts/${version}`),
  regenerateSection: (id: string, version: number, body: SectionRegenRequest) =>
    request<DraftDetail>(`/jobs/${id}/drafts/${version}/regenerate-section`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  restoreVersion: (id: string, version: number) =>
    request<DraftDetail>(`/jobs/${id}/drafts/${version}/restore`, {
      method: "POST",
    }),
  eventsUrl: (id: string) => `${API_BASE_URL}/jobs/${id}/events`,
};
