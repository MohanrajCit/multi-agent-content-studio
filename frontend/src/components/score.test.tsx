import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScoreBar } from "@/components/score-bar";
import { ScoreRing } from "@/components/score-ring";

describe("score components", () => {
  it("ScoreBar shows label and rounded value", () => {
    render(<ScoreBar label="SEO" value={72.4} />);
    expect(screen.getByText("SEO")).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
  });

  it("ScoreRing shows the rounded score", () => {
    render(<ScoreRing value={88.6} />);
    expect(screen.getByText("89")).toBeInTheDocument();
  });

  it("ScoreRing renders an em dash when value is null", () => {
    render(<ScoreRing value={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
