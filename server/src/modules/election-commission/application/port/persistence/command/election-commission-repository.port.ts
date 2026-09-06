import type { ElectionCommissionAggregate } from '../../../../domain/election-commission.aggregate';

export const ELECTION_COMMISSION_REPOSITORY_PORT = Symbol(
  'ELECTION_COMMISSION_REPOSITORY_PORT',
);

export interface ElectionCommissionRepositoryPort {
  softDelete(commissionId: string, deletedAt: Date): Promise<void>;
  nextId(): string;
  findById(
    commissionId: string,
  ): Promise<ElectionCommissionAggregate | undefined>;
  save(commission: ElectionCommissionAggregate): Promise<void>;
}
