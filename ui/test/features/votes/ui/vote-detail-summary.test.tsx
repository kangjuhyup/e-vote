/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { voteFixtureDetails } from "@/features/votes/api/votes-fixtures";
import { VoteDetailSummary } from "@/features/votes/ui/vote-detail-summary";

describe("VoteDetailSummary", () => {
  afterEach(cleanup);

  it("links directly to per-elector participation links in development", () => {
    const vote = voteFixtureDetails.find((item) => item.id === "active-general");
    if (!vote) throw new Error("active-general fixture is required");

    render(<VoteDetailSummary vote={vote} />);

    expect(
      screen.getByRole("link", { name: "선거인별 참여 링크" }),
    ).toHaveProperty("href", expect.stringContaining(`/votes/${vote.id}/electors`));
  });
});
