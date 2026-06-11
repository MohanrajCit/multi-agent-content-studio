export const queryKeys = {
  jobs: ["jobs"] as const,
  job: (id: string) => ["jobs", id] as const,
  status: (id: string) => ["jobs", id, "status"] as const,
  results: (id: string) => ["jobs", id, "results"] as const,
  drafts: (id: string) => ["jobs", id, "drafts"] as const,
  draft: (id: string, version: number) =>
    ["jobs", id, "drafts", version] as const,
};
