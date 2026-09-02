export class GetElectoralRollQuery {
  private constructor(
    readonly userPrincipalId: string,
    readonly electoralRollId: string,
  ) {}

  static of(params: {
    readonly userPrincipalId: string;
    readonly electoralRollId: string;
  }): GetElectoralRollQuery {
    return new GetElectoralRollQuery(
      params.userPrincipalId,
      params.electoralRollId,
    );
  }
}
