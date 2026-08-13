import { beforeEach, describe, expect, it } from "vitest";

import { useVotesUiStore } from "./votes-ui.store";

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

    expect(useVotesUiStore.getState().electorParticipationFilter).toBe(
      "not-participated",
    );
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
    });
  });
});
