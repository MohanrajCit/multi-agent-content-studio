import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { JobStatusBadge, RunStatusBadge } from "@/components/status-badge";

describe("status badges", () => {
  it("renders the job status label", () => {
    render(<JobStatusBadge status="DONE" />);
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders the rejected label", () => {
    render(<JobStatusBadge status="REJECTED" />);
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("renders run status labels", () => {
    render(<RunStatusBadge status="RUNNING" />);
    expect(screen.getByText("Running")).toBeInTheDocument();
  });
});
