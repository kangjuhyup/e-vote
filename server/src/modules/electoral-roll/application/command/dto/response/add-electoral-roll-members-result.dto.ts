export class AddElectoralRollMembersResult {
  private constructor(
    readonly electoralRollId: string,
    readonly revision: number,
    readonly addedMemberCount: number,
  ) {}

  static of(params: {
    readonly electoralRollId: string;
    readonly revision: number;
    readonly addedMemberCount: number;
  }): AddElectoralRollMembersResult {
    return new AddElectoralRollMembersResult(
      params.electoralRollId,
      params.revision,
      params.addedMemberCount,
    );
  }
}
