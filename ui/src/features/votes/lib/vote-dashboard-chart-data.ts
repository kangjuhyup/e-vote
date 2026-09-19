import { getParticipationPercent } from '@/features/votes/model/vote-selectors';
import type { VoteSummary } from '@/features/votes/model/vote.types';

export function getDashboardParticipationRows(votes: VoteSummary[]) {
  return votes
    .map((vote) => ({
      id: vote.id,
      title: vote.title,
      electorCount: vote.electorCount,
      participatedCount: vote.participatedCount,
      percent: vote.participationKnown
        ? getParticipationPercent(vote.participatedCount, vote.electorCount)
        : null,
    }))
    .sort((left, right) => {
      if (left.percent === null) return right.percent === null ? 0 : 1;
      if (right.percent === null) return -1;
      return left.percent - right.percent;
    })
    .slice(0, 5);
}
