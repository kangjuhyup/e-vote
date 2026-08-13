export class GetElectorQuery {
  private constructor(
    readonly voteId: string,
    readonly electorId: string,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly electorId: string;
  }): GetElectorQuery {
    return new GetElectorQuery(params.voteId, params.electorId);
  }
}
