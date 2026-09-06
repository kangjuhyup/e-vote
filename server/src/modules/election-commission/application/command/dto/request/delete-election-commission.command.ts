export class DeleteElectionCommissionCommand {
  private constructor(
    readonly commissionId: string,
    readonly userPrincipalId: string,
    readonly changedAt: Date,
  ) {}
  static of(params: {
    readonly commissionId: string;
    readonly userPrincipalId: string;
    readonly changedAt: Date;
  }): DeleteElectionCommissionCommand {
    return new DeleteElectionCommissionCommand(
      params.commissionId,
      params.userPrincipalId,
      params.changedAt,
    );
  }
}
