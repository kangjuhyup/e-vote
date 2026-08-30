import { create } from "zustand";

import type {
  ElectorParticipationFilter,
  VoteStatusFilter,
} from "@/features/votes/model/vote.types";

interface VotesUiState {
  electorPage: number;
  statusFilter: VoteStatusFilter;
  searchText: string;
  electorParticipationFilter: ElectorParticipationFilter;
  setElectorPage: (electorPage: number) => void;
  setStatusFilter: (statusFilter: VoteStatusFilter) => void;
  setSearchText: (searchText: string) => void;
  setElectorParticipationFilter: (
    electorParticipationFilter: ElectorParticipationFilter,
  ) => void;
  resetElectorFilters: () => void;
  resetVoteListFilters: () => void;
  resetVotesUi: () => void;
}

const defaultVotesUiState = {
  statusFilter: "all",
  searchText: "",
  electorParticipationFilter: "all",
  electorPage: 1,
} satisfies Pick<
  VotesUiState,
  | "statusFilter"
  | "searchText"
  | "electorParticipationFilter"
  | "electorPage"
>;

export const useVotesUiStore = create<VotesUiState>((set) => ({
  ...defaultVotesUiState,
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSearchText: (searchText) => set({ searchText }),
  setElectorPage: (electorPage) => set({ electorPage }),
  setElectorParticipationFilter: (electorParticipationFilter) =>
    set({ electorParticipationFilter }),
  resetElectorFilters: () =>
    set({ electorParticipationFilter: "all", electorPage: 1 }),
  resetVoteListFilters: () => set({ statusFilter: "all", searchText: "" }),
  resetVotesUi: () => set(defaultVotesUiState),
}));
