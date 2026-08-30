export class RemoveElectoralRollMemberCommand {
  private constructor(
    readonly electoralRollId: string,
    readonly memberId: string,
    readonly changedAt: Date,
  ) {}

  static of(params: {
    readonly electoralRollId: string;
    readonly memberId: string;
    readonly changedAt: Date;
  }): RemoveElectoralRollMemberCommand {
    return new RemoveElectoralRollMemberCommand(
      params.electoralRollId,
      params.memberId,
      params.changedAt,
    );
  }
}
