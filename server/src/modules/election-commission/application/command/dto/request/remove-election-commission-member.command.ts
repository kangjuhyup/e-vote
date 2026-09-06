export class RemoveElectionCommissionMemberCommand {
  private constructor(
    readonly commissionId: string,
    readonly memberId: string,
    readonly userPrincipalId: string,
    readonly changedAt: Date,
  ) {}
  static of(params: {
    readonly commissionId: string;
    readonly memberId: string;
    readonly userPrincipalId: string;
    readonly changedAt: Date;
  }): RemoveElectionCommissionMemberCommand {
    return new RemoveElectionCommissionMemberCommand(
      params.commissionId,
      params.memberId,
      params.userPrincipalId,
      params.changedAt,
    );
  }
}
