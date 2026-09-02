export class RemoveElectoralRollMemberCommand {
  private constructor(
    readonly userPrincipalId: string,
    readonly electoralRollId: string,
    readonly memberId: string,
    readonly changedAt: Date,
  ) {}

  static of(params: {
    readonly userPrincipalId: string;
    readonly electoralRollId: string;
    readonly memberId: string;
    readonly changedAt: Date;
  }): RemoveElectoralRollMemberCommand {
    return new RemoveElectoralRollMemberCommand(
      params.userPrincipalId,
      params.electoralRollId,
      params.memberId,
      params.changedAt,
    );
  }
}
