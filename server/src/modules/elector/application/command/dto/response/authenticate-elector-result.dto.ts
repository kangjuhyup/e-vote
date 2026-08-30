export class AuthenticateElectorResult {
  private constructor(
    readonly id: string,
    readonly voteId: string,
    readonly identityVerified: boolean,
  ) {}

  static of(params: {
    readonly id: string;
    readonly voteId: string;
    readonly identityVerified: boolean;
  }): AuthenticateElectorResult {
    return new AuthenticateElectorResult(
      params.id,
      params.voteId,
      params.identityVerified,
    );
  }
}
