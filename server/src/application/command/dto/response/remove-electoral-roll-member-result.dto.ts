export class RemoveElectoralRollMemberResult {
  private constructor(
    readonly electoralRollId: string,
    readonly memberId: string,
    readonly revision: number,
  ) {}

  static of(params: {
    readonly electoralRollId: string;
    readonly memberId: string;
    readonly revision: number;
  }): RemoveElectoralRollMemberResult {
    return new RemoveElectoralRollMemberResult(
      params.electoralRollId,
      params.memberId,
      params.revision,
    );
  }
}
