import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VoteListRow } from "@/features/votes/ui/vote-list-row";
import type { VoteSummary } from "@/features/votes/model/vote.types";

describe("VoteListRow", () => {
  it("renders unknown participation counts without showing a zero participant count", () => {
    const vote: VoteSummary = {
      id: "vote-1",
      title: "참여 집계 미제공 투표",
      status: "active",
      startsAt: "2026-08-10T09:00:00.000Z",
      endsAt: "2026-08-20T09:00:00.000Z",
      electorCount: 12,
      participatedCount: 0,
      participationKnown: false,
    };

    const markup = renderToStaticMarkup(<VoteListRow vote={vote} />);

    expect(markup).toContain("선거인 12명 / 참여 집계 전");
    expect(markup).not.toContain("참여 0명");
  });
});
