export class GetDevelopmentParticipationDispatchLinkQuery {
  private constructor(
    readonly voteId: string,
    readonly smsDispatchId: string,
    readonly electorId: string,
    readonly requestedByUserPrincipalId: string,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly smsDispatchId: string;
    readonly electorId: string;
    readonly requestedByUserPrincipalId: string;
  }): GetDevelopmentParticipationDispatchLinkQuery {
    return new GetDevelopmentParticipationDispatchLinkQuery(
      params.voteId,
      params.smsDispatchId,
      params.electorId,
      params.requestedByUserPrincipalId,
    );
  }
}
