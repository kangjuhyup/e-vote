import type { ElectionCommissionMemberAggregate } from '../../../../domain/election-commission-member.aggregate';

export const ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT = Symbol(
  'ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT',
);

export interface ElectionCommissionMemberRepositoryPort {
  findActiveAdmins(
    commissionId: string,
  ): Promise<ElectionCommissionMemberAggregate[]>;
  nextId(): string;
  findByIds(
    commissionId: string,
    memberIds: readonly string[],
  ): Promise<ElectionCommissionMemberAggregate[]>;
  save(member: ElectionCommissionMemberAggregate): Promise<void>;
}
