import type { ElectorAggregate } from '../../domain/elector/elector.aggregate';

export const ELECTOR_REPOSITORY_PORT = Symbol('ELECTOR_REPOSITORY_PORT');

export interface ElectorRepositoryPort {
  nextId(): string;
  findById(
    voteId: string,
    electorId: string,
  ): Promise<ElectorAggregate | undefined>;
  save(elector: ElectorAggregate): Promise<void>;
}
