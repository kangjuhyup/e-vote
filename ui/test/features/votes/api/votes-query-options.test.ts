import { describe, expect, it } from "vitest";

import {
  voteDashboardQueryOptions,
  voteDetailQueryOptions,
} from "@/features/votes/api/votes-query-options";
import type { VoteDashboard, VoteDetail } from "@/features/votes/model/vote.types";

async function runQuery<T>(queryFn: unknown): Promise<T> {
  if (typeof queryFn !== "function") {
    throw new Error("queryFn is not callable");
  }

  return queryFn({} as never) as Promise<T>;
}

describe("votes query options", () => {
  it("keeps fixture fallback detail aggregate counts consistent with the roster", async () => {
    const vote = await runQuery<VoteDetail | null>(
      voteDetailQueryOptions("active-general").queryFn,
    );

    if (!vote || typeof vote !== "object") {
      throw new Error("expected vote detail");
    }

    const detail = vote as {
      electorCount: number;
      participatedCount: number;
      electors: Array<{ participated: boolean }>;
    };

    expect(detail.electorCount).toBe(detail.electors.length);
    expect(detail.participatedCount).toBe(
      detail.electors.filter((elector) => elector.participated).length,
    );
  });

  it("returns dashboard summaries without candidate or elector rosters", async () => {
    const dashboard = await runQuery<VoteDashboard>(
      voteDashboardQueryOptions().queryFn,
    );

    expect(dashboard.activeVotes[0]).not.toHaveProperty("candidates");
    expect(dashboard.activeVotes[0]).not.toHaveProperty("electors");
  });
});
