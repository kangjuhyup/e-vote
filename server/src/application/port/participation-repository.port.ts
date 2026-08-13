import type { ParticipationAggregate } from '../../domain/participation/participation.aggregate';

export const PARTICIPATION_REPOSITORY_PORT = Symbol(
  'PARTICIPATION_REPOSITORY_PORT',
);

export interface ParticipationRepositoryPort {
  nextId(): string;
  findById(
    participationId: string,
  ): Promise<ParticipationAggregate | undefined>;
  findCastByVoteDetailId(
    voteDetailId: string,
  ): Promise<ParticipationAggregate[]>;
  save(participation: ParticipationAggregate): Promise<void>;
}
