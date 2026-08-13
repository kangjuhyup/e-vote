import { describe, expect, it } from "vitest";

import {
  buildVoteDashboard,
  filterElectors,
  filterVotes,
  findVoteDetail,
  formatParticipationRate,
  getParticipationPercent,
} from "@/features/votes/model/vote-selectors";
import type { VoteDetail, VoteSummary } from "@/features/votes/model/vote.types";

const summaries: VoteSummary[] = [
  {
    id: "active-general",
    title: "2026 상반기 대표 선출",
    status: "active",
    startsAt: "2026-08-10T09:00:00.000Z",
    endsAt: "2026-08-20T09:00:00.000Z",
    electorCount: 100,
    participatedCount: 72,
  },
  {
    id: "scheduled-budget",
    title: "예산 승인 투표",
    status: "scheduled",
    startsAt: "2026-09-01T09:00:00.000Z",
    endsAt: "2026-09-05T09:00:00.000Z",
    electorCount: 50,
    participatedCount: 0,
  },
];

const details: VoteDetail[] = [
  {
    ...summaries[0],
    description: "대표 후보를 선출합니다.",
    candidates: [
      { id: "candidate-1", name: "김대표", description: "운영 개선", order: 1 },
    ],
    electors: [
      {
        id: "elector-1",
        name: "이선거",
        label: "운영팀",
        participated: true,
        participatedAt: "2026-08-11T02:00:00.000Z",
      },
      {
        id: "elector-2",
        name: "박미참",
        label: "재무팀",
        participated: false,
        participatedAt: null,
      },
    ],
  },
  {
    ...summaries[1],
    description: "예산안을 승인합니다.",
    candidates: [],
    electors: [],
  },
];

describe("vote selectors", () => {
  it("formats participation from counts and handles an empty electorate", () => {
    expect(getParticipationPercent(72, 100)).toBe(72);
    expect(formatParticipationRate(72, 100)).toBe("72%");
    expect(getParticipationPercent(0, 0)).toBe(0);
    expect(formatParticipationRate(0, 0)).toBe("0%");
    expect(getParticipationPercent(12, 10)).toBe(100);
    expect(getParticipationPercent(-1, 10)).toBe(0);
  });

  it("filters votes by status and search text", () => {
    expect(
      filterVotes(summaries, { statusFilter: "active", searchText: "" }),
    ).toEqual([summaries[0]]);
    expect(
      filterVotes(summaries, { statusFilter: "all", searchText: "예산" }),
    ).toEqual([summaries[1]]);
    expect(
      filterVotes(summaries, { statusFilter: "completed", searchText: "" }),
    ).toEqual([]);
  });

  it("filters electors by participation state", () => {
    expect(filterElectors(details[0].electors, "participated")).toEqual([
      details[0].electors[0],
    ]);
    expect(filterElectors(details[0].electors, "not-participated")).toEqual([
      details[0].electors[1],
    ]);
    expect(filterElectors(details[0].electors, "all")).toEqual(
      details[0].electors,
    );
  });

  it("returns null for an unknown vote detail id", () => {
    expect(findVoteDetail(details, "missing")).toBeNull();
  });

  it("builds dashboard sections from vote details", () => {
    expect(
      buildVoteDashboard(details, "2026-08-13T00:00:00.000Z"),
    ).toMatchObject({
      metrics: {
        activeVotes: 1,
        scheduledVotes: 1,
        completedVotes: 0,
        averageParticipationRate: "36%",
      },
      activeVotes: [summaries[0]],
      upcomingVotes: [summaries[1]],
      attentionVotes: [],
      generatedAt: "2026-08-13T00:00:00.000Z",
    });
    expect("candidates" in buildVoteDashboard(details).activeVotes[0]).toBe(
      false,
    );
    expect("electors" in buildVoteDashboard(details).activeVotes[0]).toBe(
      false,
    );
  });
});
