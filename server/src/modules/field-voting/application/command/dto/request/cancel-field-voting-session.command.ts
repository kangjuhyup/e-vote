export class CancelFieldVotingSessionCommand {
  private constructor(
    readonly fieldVotingSessionId: string,
    readonly canceledAt: Date,
  ) {}

  static of(params: {
    fieldVotingSessionId: string;
    canceledAt: Date;
  }): CancelFieldVotingSessionCommand {
    return new CancelFieldVotingSessionCommand(
      params.fieldVotingSessionId,
      params.canceledAt,
    );
  }
}
