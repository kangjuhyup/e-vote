export class GetElectoralRollQuery {
  private constructor(readonly electoralRollId: string) {}

  static of(params: {
    readonly electoralRollId: string;
  }): GetElectoralRollQuery {
    return new GetElectoralRollQuery(params.electoralRollId);
  }
}
