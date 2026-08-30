export class CreateVoteUsageBillingOrderCommand {
  private constructor(
    readonly voteId: string,
    readonly orderedByUserPrincipalId: string,
    readonly issuedAt: Date,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly orderedByUserPrincipalId: string;
    readonly issuedAt: Date;
  }): CreateVoteUsageBillingOrderCommand {
    return new CreateVoteUsageBillingOrderCommand(
      params.voteId,
      params.orderedByUserPrincipalId,
      params.issuedAt,
    );
  }
}
