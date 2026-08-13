import type { VoteDetailAggregate } from '../../domain/vote/vote-detail.aggregate';

export const VOTE_DETAIL_REPOSITORY_PORT = Symbol(
  'VOTE_DETAIL_REPOSITORY_PORT',
);

export interface VoteDetailRepositoryPort {
  nextId(): string;
  save(voteDetail: VoteDetailAggregate): Promise<void>;
}
