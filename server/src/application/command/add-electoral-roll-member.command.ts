export class AddElectoralRollMemberCommand {
  private constructor(
    readonly electoralRollId: string,
    readonly identifier: string,
    readonly groupKey: string | undefined,
    readonly voteWeight: number,
    readonly changedAt: Date,
  ) {}

  static of(params: {
    readonly electoralRollId: string;
    readonly identifier: string;
    readonly groupKey?: string;
    readonly voteWeight?: number;
    readonly changedAt: Date;
  }): AddElectoralRollMemberCommand {
    return new AddElectoralRollMemberCommand(
      params.electoralRollId,
      params.identifier,
      params.groupKey,
      params.voteWeight ?? 1,
      params.changedAt,
    );
  }
}
