export class GetDevelopmentParticipationLinkQuery {
  private constructor(
    readonly voteId: string,
    readonly electorId: string,
    readonly requestedByUserPrincipalId: string,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly electorId: string;
    readonly requestedByUserPrincipalId: string;
  }): GetDevelopmentParticipationLinkQuery {
    return new GetDevelopmentParticipationLinkQuery(
      params.voteId,
      params.electorId,
      params.requestedByUserPrincipalId,
    );
  }
}
