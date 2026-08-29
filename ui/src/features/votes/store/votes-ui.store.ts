import { create } from "zustand";

import type {
  ElectorParticipationFilter,
  VoteStatusFilter,
} from "@/features/votes/model/vote.types";

interface VotesUiState {
  statusFilter: VoteStatusFilter;
  searchText: string;
  electorParticipationFilter: ElectorParticipationFilter;
  setStatusFilter: (statusFilter: VoteStatusFilter) => void;
  setSearchText: (searchText: string) => void;
  setElectorParticipationFilter: (
    electorParticipationFilter: ElectorParticipationFilter,
  ) => void;
  resetVotesUi: () => void;
}

const defaultVotesUiState = {
  statusFilter: "all",
  searchText: "",
  electorParticipationFilter: "all",
} satisfies Pick<
  VotesUiState,
  "statusFilter" | "searchText" | "electorParticipationFilter"
>;

export const useVotesUiStore = create<VotesUiState>((set) => ({
  ...defaultVotesUiState,
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSearchText: (searchText) => set({ searchText }),
  setElectorParticipationFilter: (electorParticipationFilter) =>
    set({ electorParticipationFilter }),
  resetVotesUi: () => set(defaultVotesUiState),
}));
