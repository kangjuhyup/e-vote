import { beforeEach, describe, expect, it } from "vitest";

import { useVotesUiStore } from "@/features/votes/store/votes-ui.store";

describe("useVotesUiStore", () => {
  beforeEach(() => {
    useVotesUiStore.getState().resetVotesUi();
  });

  it("stores vote list filters", () => {
    useVotesUiStore.getState().setStatusFilter("active");
    useVotesUiStore.getState().setSearchText("대표");

    expect(useVotesUiStore.getState().statusFilter).toBe("active");
    expect(useVotesUiStore.getState().searchText).toBe("대표");
  });

  it("stores elector roster participation filter", () => {
    useVotesUiStore.getState().setElectorParticipationFilter("not-participated");
    useVotesUiStore.getState().setElectorPage(3);

    expect(useVotesUiStore.getState().electorParticipationFilter).toBe(
      "not-participated",
    );
    expect(useVotesUiStore.getState().electorPage).toBe(3);
  });

  it("resets filters to default values", () => {
    useVotesUiStore.getState().setStatusFilter("completed");
    useVotesUiStore.getState().setSearchText("예산");
    useVotesUiStore.getState().setElectorParticipationFilter("participated");

    useVotesUiStore.getState().resetVotesUi();

    expect(useVotesUiStore.getState()).toMatchObject({
      statusFilter: "all",
      searchText: "",
      electorParticipationFilter: "all",
      electorPage: 1,
    });
  });

  it("resets vote list and elector filters independently", () => {
    useVotesUiStore.getState().setStatusFilter("active");
    useVotesUiStore.getState().setSearchText("대표");
    useVotesUiStore.getState().setElectorParticipationFilter("participated");
    useVotesUiStore.getState().setElectorPage(2);

    useVotesUiStore.getState().resetVoteListFilters();

    expect(useVotesUiStore.getState()).toMatchObject({
      statusFilter: "all",
      searchText: "",
      electorParticipationFilter: "participated",
      electorPage: 2,
    });

    useVotesUiStore.getState().resetElectorFilters();

    expect(useVotesUiStore.getState()).toMatchObject({
      electorParticipationFilter: "all",
      electorPage: 1,
    });
  });
});
