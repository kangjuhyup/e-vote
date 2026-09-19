import type { VoteAggregate } from '../../../../domain/vote/vote.aggregate';

export const VOTE_SCHEDULE_REPOSITORY_PORT = Symbol(
  'VOTE_SCHEDULE_REPOSITORY_PORT',
);

export interface VoteScheduleRepositoryPort {
  findDueForPaymentExpiration(
    now: Date,
    limit: number,
  ): Promise<VoteAggregate[]>;
  findDueForOpening(now: Date, limit: number): Promise<VoteAggregate[]>;
  findDueForClosing(now: Date, limit: number): Promise<VoteAggregate[]>;
  save(vote: VoteAggregate): Promise<void>;
}
