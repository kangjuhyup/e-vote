import type {
  ElectorParticipationFilter,
  VoteStatusFilter,
} from "@/features/votes/model/vote.types";

const voteStatusFilters = new Set<VoteStatusFilter>([
  "all",
  "active",
  "scheduled",
  "completed",
  "finalized",
  "draft",
  "canceled",
]);

const electorParticipationFilters = new Set<ElectorParticipationFilter>([
  "all",
  "participated",
  "not-participated",
]);

export interface VoteListSearchState {
  searchText: string;
  statusFilter: VoteStatusFilter;
}

export interface VoteDetailSearchState {
  electorPage: number;
  electorParticipationFilter: ElectorParticipationFilter;
}

export function readVoteListSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): VoteListSearchState {
  const status = searchParams.get("status") as VoteStatusFilter | null;

  return {
    statusFilter: status && voteStatusFilters.has(status) ? status : "all",
    searchText: searchParams.get("q")?.trim() ?? "",
  };
}

export function writeVoteListSearchParams(
  searchParams: URLSearchParams,
  state: VoteListSearchState,
) {
  const next = new URLSearchParams(searchParams);

  if (state.statusFilter === "all") {
    next.delete("status");
  } else {
    next.set("status", state.statusFilter);
  }

  const searchText = state.searchText.trim();
  if (searchText.length === 0) {
    next.delete("q");
  } else {
    next.set("q", searchText);
  }

  return next.toString();
}

export function readVoteDetailSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): VoteDetailSearchState {
  const participation = searchParams.get(
    "participation",
  ) as ElectorParticipationFilter | null;
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);

  return {
    electorParticipationFilter:
      participation && electorParticipationFilters.has(participation)
        ? participation
        : "all",
    electorPage: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function writeVoteDetailSearchParams(
  searchParams: URLSearchParams,
  state: VoteDetailSearchState,
) {
  const next = new URLSearchParams(searchParams);

  if (state.electorParticipationFilter === "all") {
    next.delete("participation");
  } else {
    next.set("participation", state.electorParticipationFilter);
  }

  if (state.electorPage <= 1) {
    next.delete("page");
  } else {
    next.set("page", String(state.electorPage));
  }

  return next.toString();
}
