import { describe, expect, it } from "vitest";

import { getVoteSmsPurpose } from "@/features/votes/model/vote-sms.types";

describe("vote SMS purpose", () => {
  it.each([
    ["draft", "UPCOMING_VOTE_NOTICE"],
    ["scheduled", "UPCOMING_VOTE_NOTICE"],
    ["finalized", "UPCOMING_VOTE_NOTICE"],
    ["active", "VOTE_PARTICIPATION_REMINDER"],
    ["completed", "VOTE_RESULT_NOTICE"],
    ["canceled", undefined],
  ] as const)("maps %s to %s", (status, expected) => {
    expect(getVoteSmsPurpose(status)).toBe(expected);
  });
});
