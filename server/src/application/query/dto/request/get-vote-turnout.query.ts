export class GetVoteTurnoutQuery {
  private constructor(
    readonly voteId: string,
    readonly voteDetailId: string,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly voteDetailId: string;
  }): GetVoteTurnoutQuery {
    return new GetVoteTurnoutQuery(params.voteId, params.voteDetailId);
  }
}
