export class UpdateElectoralRollMemberCommand {
  private constructor(
    readonly electoralRollId: string,
    readonly memberId: string,
    readonly identifier: string,
    readonly groupKey: string | undefined,
    readonly voteWeight: number,
    readonly changedAt: Date,
  ) {}

  static of(params: {
    readonly electoralRollId: string;
    readonly memberId: string;
    readonly identifier: string;
    readonly groupKey?: string;
    readonly voteWeight: number;
    readonly changedAt: Date;
  }): UpdateElectoralRollMemberCommand {
    return new UpdateElectoralRollMemberCommand(
      params.electoralRollId,
      params.memberId,
      params.identifier,
      params.groupKey,
      params.voteWeight,
      params.changedAt,
    );
  }
}
