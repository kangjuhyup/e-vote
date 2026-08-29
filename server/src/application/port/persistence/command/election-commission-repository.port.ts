import type { ElectionCommissionAggregate } from '../../../../domain/election-commission/election-commission.aggregate';

export const ELECTION_COMMISSION_REPOSITORY_PORT = Symbol(
  'ELECTION_COMMISSION_REPOSITORY_PORT',
);

export interface ElectionCommissionRepositoryPort {
  nextId(): string;
  findById(
    commissionId: string,
  ): Promise<ElectionCommissionAggregate | undefined>;
  save(commission: ElectionCommissionAggregate): Promise<void>;
}
