import type { VoteAggregate } from '../../../../domain/vote/vote.aggregate';

export const VOTE_REPOSITORY_PORT = Symbol('VOTE_REPOSITORY_PORT');

export interface VoteRepositoryPort {
  nextId(): string;
  findById(voteId: string): Promise<VoteAggregate | undefined>;
  save(vote: VoteAggregate): Promise<void>;
}
