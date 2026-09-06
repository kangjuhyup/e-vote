import { describe, expect, it } from "vitest";

import {
  getVoteStatusLabel,
  getVoteStatusVariant,
  toCandidateItems,
} from "@/features/votes/lib/vote-view-models";

describe("vote view models", () => {
  it("shows active billing lifecycle states ahead of the stored vote status", () => {
    expect(getVoteStatusLabel("draft", "PENDING_PAYMENT")).toBe(
      "결제 처리 중",
    );
    expect(getVoteStatusVariant("draft", "PENDING_PAYMENT")).toBe(
      "secondary",
    );
    expect(getVoteStatusLabel("finalized", "PAID")).toBe(
      "확정됨(개시 전)",
    );
    expect(getVoteStatusLabel("finalized", "REFUND_PENDING")).toBe(
      "확정됨(개시 전)",
    );
    expect(getVoteStatusLabel("draft")).toBe("초안");
  });

  it("orders candidate items by ballot order", () => {
    const items = toCandidateItems([
      {
        id: "candidate-2",
        name: "두번째 후보",
        description: "두번째 설명",
        order: 2,
      },
      {
        id: "candidate-1",
        name: "첫번째 후보",
        description: "첫번째 설명",
        order: 1,
      },
    ]);

    expect(items.map((item) => item.title)).toEqual([
      "첫번째 후보",
      "두번째 후보",
    ]);
  });
});
