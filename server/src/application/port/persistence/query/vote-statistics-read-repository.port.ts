import type { VoteResultView } from '../../../query/view/vote-result.view';
import type { VoteTurnoutView } from '../../../query/view/vote-turnout.view';

export const VOTE_STATISTICS_READ_REPOSITORY_PORT = Symbol(
  'VOTE_STATISTICS_READ_REPOSITORY_PORT',
);

export interface VoteStatisticsReadRepositoryPort {
  getTurnout(
    voteId: string,
    voteDetailId: string,
  ): Promise<VoteTurnoutView | undefined>;
  getResult(
    voteId: string,
    voteDetailId: string,
  ): Promise<VoteResultView | undefined>;
}
