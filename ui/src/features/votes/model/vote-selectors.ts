import type {
  ElectorParticipationFilter,
  VoteDashboard,
  VoteDetail,
  VoteElector,
  VoteStatusFilter,
  VoteSummary,
} from "./vote.types";

export function getParticipationPercent(
  participatedCount: number,
  electorCount: number,
) {
  if (electorCount <= 0) {
    return 0;
  }

  return Math.round((participatedCount / electorCount) * 100);
}

export function formatParticipationRate(
  participatedCount: number,
  electorCount: number,
) {
  return `${getParticipationPercent(participatedCount, electorCount)}%`;
}

export function filterVotes(
  votes: VoteSummary[],
  input: { statusFilter: VoteStatusFilter; searchText: string },
) {
  const normalizedSearchText = input.searchText.trim().toLocaleLowerCase();

  return votes.filter((vote) => {
    const matchesStatus =
      input.statusFilter === "all" || vote.status === input.statusFilter;
    const matchesSearch =
      normalizedSearchText.length === 0 ||
      vote.title.toLocaleLowerCase().includes(normalizedSearchText);

    return matchesStatus && matchesSearch;
  });
}

export function filterElectors(
  electors: VoteElector[],
  filter: ElectorParticipationFilter,
) {
  if (filter === "all") {
    return electors;
  }

  return electors.filter((elector) =>
    filter === "participated" ? elector.participated : !elector.participated,
  );
}

export function findVoteDetail(votes: VoteDetail[], voteId: string) {
  return votes.find((vote) => vote.id === voteId) ?? null;
}

export function buildVoteDashboard(votes: VoteDetail[]): VoteDashboard {
  const activeVotes = votes.filter((vote) => vote.status === "active");
  const upcomingVotes = votes.filter((vote) => vote.status === "scheduled");
  const completedVotes = votes.filter((vote) => vote.status === "completed");
  const attentionVotes = votes.filter(
    (vote) =>
      vote.status === "active" &&
      getParticipationPercent(vote.participatedCount, vote.electorCount) < 40,
  );

  const averageParticipationPercent =
    votes.length === 0
      ? 0
      : Math.round(
          votes.reduce(
            (sum, vote) =>
              sum +
              getParticipationPercent(vote.participatedCount, vote.electorCount),
            0,
          ) / votes.length,
        );

  return {
    metrics: {
      activeVotes: activeVotes.length,
      scheduledVotes: upcomingVotes.length,
      completedVotes: completedVotes.length,
      averageParticipationRate: `${averageParticipationPercent}%`,
    },
    activeVotes,
    upcomingVotes,
    attentionVotes,
    recentActivities: votes.slice(0, 4).map((vote) => ({
      id: `${vote.id}-activity`,
      title: vote.title,
      detail: `${formatParticipationRate(
        vote.participatedCount,
        vote.electorCount,
      )} 참여 / ${vote.electorCount.toLocaleString()}명 대상`,
      status: vote.status === "active" ? "stable" : "pending",
    })),
    generatedAt: new Date().toISOString(),
  };
}
