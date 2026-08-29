export class GetVoteResultQuery {
  private constructor(
    readonly voteId: string,
    readonly voteDetailId: string,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly voteDetailId: string;
  }): GetVoteResultQuery {
    return new GetVoteResultQuery(params.voteId, params.voteDetailId);
  }
}
