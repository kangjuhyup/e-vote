import type {
  ElectorParticipationFilter,
  VoteDashboard,
  VoteElector,
  VoteStatusFilter,
  VoteSummary,
} from "./vote.types";

function clampParticipationPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function toVoteSummary(vote: VoteSummary): VoteSummary {
  return {
    commissionId: vote.commissionId,
    electoralRollSnapshotId: vote.electoralRollSnapshotId,
    id: vote.id,
    title: vote.title,
    status: vote.status,
    startsAt: vote.startsAt,
    endsAt: vote.endsAt,
    electorCount: vote.electorCount,
    participatedCount: vote.participatedCount,
    participationKnown: vote.participationKnown,
  };
}

export function getParticipationPercent(
  participatedCount: number,
  electorCount: number,
) {
  if (electorCount <= 0) {
    return 0;
  }

  return clampParticipationPercent(
    Math.round((participatedCount / electorCount) * 100),
  );
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
    elector.participationKnown &&
    (filter === "participated" ? elector.participated : !elector.participated),
  );
}

export function findVoteDetail<TVote extends { id: string }>(
  votes: TVote[],
  voteId: string,
) {
  return votes.find((vote) => vote.id === voteId) ?? null;
}

export function buildVoteDashboard(
  votes: VoteSummary[],
  generatedAt = "",
): VoteDashboard {
  const summaries = votes.map(toVoteSummary);
  const activeVotes = summaries.filter((vote) => vote.status === "active");
  const upcomingVotes = summaries.filter((vote) => vote.status === "scheduled");
  const completedVotes = summaries.filter((vote) => vote.status === "completed");
  const attentionVotes = summaries.filter(
    (vote) =>
      vote.participationKnown &&
      vote.status === "active" &&
      getParticipationPercent(vote.participatedCount, vote.electorCount) < 40,
  );
  const participationKnownVotes = summaries.filter(
    (vote) => vote.participationKnown,
  );

  const averageParticipationPercent =
    participationKnownVotes.length === 0
      ? null
      : Math.round(
          participationKnownVotes.reduce(
            (sum, vote) =>
              sum +
              getParticipationPercent(vote.participatedCount, vote.electorCount),
            0,
          ) / participationKnownVotes.length,
        );

  return {
    metrics: {
      activeVotes: activeVotes.length,
      scheduledVotes: upcomingVotes.length,
      completedVotes: completedVotes.length,
      averageParticipationRate:
        averageParticipationPercent === null
          ? "집계 전"
          : `${averageParticipationPercent}%`,
    },
    activeVotes,
    upcomingVotes,
    attentionVotes,
    recentActivities: votes.slice(0, 4).map((vote) => ({
      id: `${vote.id}-activity`,
      title: vote.title,
      detail: vote.participationKnown
        ? `${formatParticipationRate(
            vote.participatedCount,
            vote.electorCount,
          )} 참여 / ${vote.electorCount.toLocaleString()}명 대상`
        : `참여 집계 전 / ${vote.electorCount.toLocaleString()}명 대상`,
      status: vote.status === "active" ? "stable" : "pending",
    })),
    generatedAt,
  };
}
