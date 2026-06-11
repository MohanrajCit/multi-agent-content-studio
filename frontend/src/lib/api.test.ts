import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, api } from "@/lib/api";

describe("api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /jobs returns parsed body", async () => {
    const jobs = [{ id: "j1", status: "DONE" }];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(jobs), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await api.listJobs();
    expect(result).toEqual(jobs);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain("/jobs");
  });

  it("POST createJob sends body and method", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "j2" }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.createJob({
      topic: "t",
      audience: "a",
      goal: "g",
      tone: "pro",
      platform: "blog",
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).topic).toBe("t");
  });

  it("throws ApiError carrying the backend error envelope", async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            error: { code: "not_found", message: "Job 'x' not found." },
          }),
          { status: 404 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const err = await api.getJob("x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404, code: "not_found" });
  });

  it("builds the SSE events URL", () => {
    expect(api.eventsUrl("abc")).toMatch(/\/jobs\/abc\/events$/);
  });
});
