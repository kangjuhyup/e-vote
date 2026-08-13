export class GetVoteQuery {
  private constructor(readonly voteId: string) {}

  static of(params: { readonly voteId: string }): GetVoteQuery {
    return new GetVoteQuery(params.voteId);
  }
}
