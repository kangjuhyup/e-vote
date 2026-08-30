export class GetVoteDetailQuery {
  private constructor(
    readonly voteId: string,
    readonly voteDetailId: string,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly voteDetailId: string;
  }): GetVoteDetailQuery {
    return new GetVoteDetailQuery(params.voteId, params.voteDetailId);
  }
}
