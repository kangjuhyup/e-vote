export class AuthenticateElectorCommand {
  private constructor(
    readonly userPrincipalId: string,
    readonly voteId: string,
    readonly electorId: string,
    readonly provider: string,
    readonly transactionId: string,
    readonly verifiedAt: Date,
  ) {}

  static of(params: {
    userPrincipalId: string;
    voteId: string;
    electorId: string;
    provider: string;
    transactionId: string;
    verifiedAt: Date;
  }): AuthenticateElectorCommand {
    return new AuthenticateElectorCommand(
      params.userPrincipalId,
      params.voteId,
      params.electorId,
      params.provider,
      params.transactionId,
      params.verifiedAt,
    );
  }
}
