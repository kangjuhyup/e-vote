import { describe, expect, it } from "vitest";

import { voteFixtureDetails } from "@/features/votes/api/votes-fixtures";
import {
  getVoteDisplayStatus,
  getVoteFinalizationIssues,
  isVoteSetupEditable,
} from "@/features/votes/lib/vote-finalization";

describe("vote finalization", () => {
  const completeVote = voteFixtureDetails.find(
    (vote) => vote.id === "scheduled-budget",
  )!;

  it("accepts a complete draft vote", () => {
    expect(getVoteFinalizationIssues(completeVote)).toEqual([]);
  });

  it("reports every missing setup required before finalization", () => {
    expect(
      getVoteFinalizationIssues({
        ...completeVote,
        commissionId: undefined,
        defaultPolicy: undefined,
        electoralRollSnapshotId: undefined,
        electorCount: 0,
        subVotes: [],
        title: " ",
        votingChannels: [],
      }),
    ).toEqual([
      "투표 제목을 입력하세요.",
      "투표 정책을 저장하세요.",
      "투표 채널을 하나 이상 선택하세요.",
      "선거관리위원회를 지정하세요.",
      "선거인명부를 연결하세요.",
      "유효한 선거인이 1명 이상 필요합니다.",
      "안건을 하나 이상 등록하세요.",
    ]);
  });

  it.each([
    ["draft", undefined, "draft", true],
    ["scheduled", undefined, "scheduled", true],
    ["draft", "PENDING_PAYMENT", "payment-processing", false],
    ["finalized", "PAID", "finalized", false],
    ["finalized", "REFUND_PENDING", "finalized", false],
    ["draft", "CANCELED", "draft", true],
    ["draft", "REFUNDED", "draft", true],
  ] as const)(
    "derives %s with %s as %s (editable: %s)",
    (voteStatus, billingStatus, displayStatus, editable) => {
      expect(getVoteDisplayStatus(voteStatus, billingStatus)).toBe(
        displayStatus,
      );
      expect(isVoteSetupEditable(voteStatus, billingStatus)).toBe(editable);
    },
  );
});
