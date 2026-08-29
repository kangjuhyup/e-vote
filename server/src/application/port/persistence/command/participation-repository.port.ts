import type { ParticipationAggregate } from '../../../../domain/participation/participation.aggregate';

export const PARTICIPATION_REPOSITORY_PORT = Symbol(
  'PARTICIPATION_REPOSITORY_PORT',
);

export type CastParticipationTransactionResources = {
  readonly voteId: string;
  readonly voteDetailId: string;
  readonly electorId: string;
  readonly candidateId: string | undefined;
  readonly fieldVotingSessionId: string | undefined;
};

export interface ParticipationRepositoryPort {
  nextId(): string;
  runCastTransaction<T>(
    resources: CastParticipationTransactionResources,
    work: () => Promise<T>,
  ): Promise<T>;
  findById(
    participationId: string,
  ): Promise<ParticipationAggregate | undefined>;
  findCastByVoteDetailId(
    voteDetailId: string,
  ): Promise<ParticipationAggregate[]>;
  save(participation: ParticipationAggregate): Promise<void>;
  saveCastWithResult(
    participation: ParticipationAggregate,
    selectedCandidateId: string,
  ): Promise<void>;
}
