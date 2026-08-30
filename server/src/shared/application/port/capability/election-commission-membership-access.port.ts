export const ELECTION_COMMISSION_MEMBERSHIP_ACCESS_PORT = Symbol(
  'ELECTION_COMMISSION_MEMBERSHIP_ACCESS_PORT',
);

export interface ElectionCommissionMembershipAccessPort {
  isActiveMember(
    commissionId: string,
    userPrincipalId: string,
  ): Promise<boolean>;
}
