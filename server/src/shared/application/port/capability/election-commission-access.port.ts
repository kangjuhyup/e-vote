import type {
  ElectionCommissionMemberReference,
  ElectionCommissionReference,
} from '../../../domain/voting/capability-reference';

export const ELECTION_COMMISSION_ACCESS_PORT = Symbol(
  'ELECTION_COMMISSION_ACCESS_PORT',
);

export interface ElectionCommissionAccessPort {
  findById(id: string): Promise<ElectionCommissionReference | undefined>;
}

export const ELECTION_COMMISSION_MEMBER_ACCESS_PORT = Symbol(
  'ELECTION_COMMISSION_MEMBER_ACCESS_PORT',
);

export interface ElectionCommissionMemberAccessPort {
  findByIds(
    commissionId: string,
    memberIds: readonly string[],
  ): Promise<readonly ElectionCommissionMemberReference[]>;
}
