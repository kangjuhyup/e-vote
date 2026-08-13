export class CloseFieldVotingSessionCommand {
  private constructor(
    readonly fieldVotingSessionId: string,
    readonly closedAt: Date,
  ) {}

  static of(params: {
    fieldVotingSessionId: string;
    closedAt: Date;
  }): CloseFieldVotingSessionCommand {
    return new CloseFieldVotingSessionCommand(
      params.fieldVotingSessionId,
      params.closedAt,
    );
  }
}
