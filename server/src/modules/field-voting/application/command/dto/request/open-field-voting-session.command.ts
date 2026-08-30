export class OpenFieldVotingSessionCommand {
  private constructor(
    readonly fieldVotingSessionId: string,
    readonly openedAt: Date,
  ) {}

  static of(params: {
    fieldVotingSessionId: string;
    openedAt: Date;
  }): OpenFieldVotingSessionCommand {
    return new OpenFieldVotingSessionCommand(
      params.fieldVotingSessionId,
      params.openedAt,
    );
  }
}
