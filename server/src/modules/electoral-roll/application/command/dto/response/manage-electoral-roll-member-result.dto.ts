export class ManageElectoralRollMemberResult {
  private constructor(
    readonly id: string,
    readonly electoralRollId: string,
    readonly identifier: string,
    readonly groupKey: string | undefined,
    readonly voteWeight: number,
    readonly revision: number,
  ) {}

  static of(params: {
    readonly id: string;
    readonly electoralRollId: string;
    readonly identifier: string;
    readonly groupKey?: string;
    readonly voteWeight: number;
    readonly revision: number;
  }): ManageElectoralRollMemberResult {
    return new ManageElectoralRollMemberResult(
      params.id,
      params.electoralRollId,
      params.identifier,
      params.groupKey,
      params.voteWeight,
      params.revision,
    );
  }
}
