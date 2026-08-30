import { describe, expect, it } from "vitest";

import {
  readVoteDetailSearchParams,
  readVoteListSearchParams,
  writeVoteDetailSearchParams,
  writeVoteListSearchParams,
} from "@/features/votes/lib/vote-search-params";

describe("vote search params", () => {
  it("reads valid vote-list filters and normalizes invalid status values", () => {
    expect(
      readVoteListSearchParams(
        new URLSearchParams("status=scheduled&q=%EC%98%88%EC%82%B0"),
      ),
    ).toEqual({ statusFilter: "scheduled", searchText: "예산" });
    expect(readVoteListSearchParams(new URLSearchParams("status=unknown"))).toEqual({
      statusFilter: "all",
      searchText: "",
    });
  });

  it("writes canonical vote-list search params without default values", () => {
    expect(
      writeVoteListSearchParams(new URLSearchParams("unrelated=kept"), {
        statusFilter: "active",
        searchText: " 대표 ",
      }),
    ).toBe("unrelated=kept&status=active&q=%EB%8C%80%ED%91%9C");
    expect(
      writeVoteListSearchParams(new URLSearchParams("status=active&q=x"), {
        statusFilter: "all",
        searchText: "",
      }),
    ).toBe("");
  });

  it("reads and writes elector filters and positive pages", () => {
    expect(
      readVoteDetailSearchParams(
        new URLSearchParams("participation=not-participated&page=3"),
      ),
    ).toEqual({
      electorParticipationFilter: "not-participated",
      electorPage: 3,
    });
    expect(readVoteDetailSearchParams(new URLSearchParams("page=-1"))).toEqual({
      electorParticipationFilter: "all",
      electorPage: 1,
    });
    expect(
      writeVoteDetailSearchParams(new URLSearchParams(), {
        electorParticipationFilter: "participated",
        electorPage: 2,
      }),
    ).toBe("participation=participated&page=2");
  });
});
