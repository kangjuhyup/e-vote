import { describe, expect, it } from "vitest";

import { toCandidateItems } from "@/features/votes/lib/vote-view-models";

describe("vote view models", () => {
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
