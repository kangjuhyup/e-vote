import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
  delete process.env.NEXT_PUBLIC_VOTE_API_BASE_URL;
  process.env.NEXT_PUBLIC_VOTE_API_MODE = "mock";
});

import {
  VOTE_LIFECYCLE_REFETCH_INTERVAL_MS,
  getVoteDetailRefetchInterval,
  getVoteListRefetchInterval,
  voteDashboardQueryOptions,
  voteDetailQueryOptions,
  voteListQueryOptions,
} from "@/features/votes/api/votes-query-options";
import type {
  VoteDashboard,
  VoteDetail,
  VoteSummary,
} from "@/features/votes/model/vote.types";

async function runQuery<T>(queryFn: unknown): Promise<T> {
  if (typeof queryFn !== "function") {
    throw new Error("queryFn is not callable");
  }

  return queryFn({} as never) as Promise<T>;
}

describe("votes query options", () => {
  const draftVote: VoteSummary = {
    id: "vote-1",
    title: "초안 투표",
    status: "draft",
    startsAt: "2026-09-10T00:00:00.000Z",
    endsAt: "2026-09-11T00:00:00.000Z",
    electorCount: 0,
    participatedCount: 0,
    participationKnown: false,
  };

  it("isolates mock data in mode-specific query cache keys", () => {
    expect(voteDashboardQueryOptions().queryKey).toEqual([
      "votes",
      "mock",
      "dashboard",
    ]);
    expect(voteDetailQueryOptions("active-general").queryKey).toEqual([
      "votes",
      "mock",
      "detail",
      "active-general",
    ]);
  });

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

  it.each(["PENDING_PAYMENT", "REFUND_PENDING"] as const)(
    "polls the single vote-list query while an order is %s",
    (billingOrderStatus) => {
      expect(
        getVoteListRefetchInterval([{ ...draftVote, billingOrderStatus }]),
      ).toBe(VOTE_LIFECYCLE_REFETCH_INTERVAL_MS);
    },
  );

  it("stops list polling when no transitional active order is exposed", () => {
    expect(
      getVoteListRefetchInterval([
        { ...draftVote, billingOrderStatus: "PAID" },
      ]),
    ).toBe(false);
    expect(getVoteListRefetchInterval([draftVote])).toBe(false);
    expect(voteListQueryOptions().queryKey).toEqual([
      "votes",
      "mock",
      "list",
    ]);
  });

  it("polls a finalized detail through its scheduled opening transition", () => {
    const finalizedVote = {
      ...draftVote,
      billingOrderStatus: "PAID" as const,
      status: "finalized" as const,
    };

    expect(
      getVoteDetailRefetchInterval(
        finalizedVote,
        Date.parse("2026-09-09T23:59:59.500Z"),
      ),
    ).toBe(1_000);
    expect(
      getVoteDetailRefetchInterval(
        finalizedVote,
        Date.parse(finalizedVote.startsAt),
      ),
    ).toBe(VOTE_LIFECYCLE_REFETCH_INTERVAL_MS);
    expect(
      getVoteDetailRefetchInterval({ ...finalizedVote, status: "active" }),
    ).toBe(false);
  });
});
