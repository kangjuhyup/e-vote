export class GetFieldVotingSessionQuery {
  private constructor(readonly fieldVotingSessionId: string) {}

  static of(params: {
    readonly fieldVotingSessionId: string;
  }): GetFieldVotingSessionQuery {
    return new GetFieldVotingSessionQuery(params.fieldVotingSessionId);
  }
}
