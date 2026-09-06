export class UpdateElectionCommissionMemberCommand {
  private constructor(
    readonly commissionId: string,
    readonly memberId: string,
    readonly userPrincipalId: string,
    readonly changedAt: Date,
    readonly name: string | undefined,
    readonly role: 'ADMIN' | 'FIELD_MANAGER' | undefined,
  ) {}
  static of(params: {
    readonly commissionId: string;
    readonly memberId: string;
    readonly userPrincipalId: string;
    readonly changedAt: Date;
    readonly name?: string | undefined;
    readonly role?: 'ADMIN' | 'FIELD_MANAGER' | undefined;
  }): UpdateElectionCommissionMemberCommand {
    return new UpdateElectionCommissionMemberCommand(
      params.commissionId,
      params.memberId,
      params.userPrincipalId,
      params.changedAt,
      params.name,
      params.role,
    );
  }
}
