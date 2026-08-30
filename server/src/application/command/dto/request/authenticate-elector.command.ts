export class AuthenticateElectorCommand {
  private constructor(
    readonly voteId: string,
    readonly electorId: string,
    readonly provider: string,
    readonly transactionId: string,
    readonly verifiedAt: Date,
  ) {}

  static of(params: {
    voteId: string;
    electorId: string;
    provider: string;
    transactionId: string;
    verifiedAt: Date;
  }): AuthenticateElectorCommand {
    return new AuthenticateElectorCommand(
      params.voteId,
      params.electorId,
      params.provider,
      params.transactionId,
      params.verifiedAt,
    );
  }
}
