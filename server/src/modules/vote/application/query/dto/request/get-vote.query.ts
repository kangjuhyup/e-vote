export class GetVoteQuery {
  private constructor(
    readonly voteId: string,
    readonly userPrincipalId: string,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly userPrincipalId: string;
  }): GetVoteQuery {
    return new GetVoteQuery(params.voteId, params.userPrincipalId);
  }
}
