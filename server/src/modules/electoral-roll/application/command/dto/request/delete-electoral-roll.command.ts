export class DeleteElectoralRollCommand {
  private constructor(
    readonly electoralRollId: string,
    readonly userPrincipalId: string,
    readonly changedAt: Date,
  ) {}
  static of(params: {
    readonly electoralRollId: string;
    readonly userPrincipalId: string;
    readonly changedAt: Date;
  }): DeleteElectoralRollCommand {
    return new DeleteElectoralRollCommand(
      params.electoralRollId,
      params.userPrincipalId,
      params.changedAt,
    );
  }
}
