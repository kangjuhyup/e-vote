import type { VoteDetailAggregate } from '../../../../domain/vote/vote-detail.aggregate';

export const VOTE_DETAIL_REPOSITORY_PORT = Symbol(
  'VOTE_DETAIL_REPOSITORY_PORT',
);

export interface VoteDetailRepositoryPort {
  nextId(): string;
  findById(voteDetailId: string): Promise<VoteDetailAggregate | undefined>;
  findByVoteIds(voteIds: readonly string[]): Promise<VoteDetailAggregate[]>;
  save(voteDetail: VoteDetailAggregate): Promise<void>;
}
