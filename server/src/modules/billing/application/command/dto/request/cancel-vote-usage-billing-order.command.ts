export class CancelVoteUsageBillingOrderCommand {
  private constructor(
    readonly billingOrderId: string,
    readonly userPrincipalId: string,
    readonly reason: string,
    readonly canceledAt: Date,
  ) {}

  static of(params: {
    billingOrderId: string;
    userPrincipalId: string;
    reason: string;
    canceledAt: Date;
  }): CancelVoteUsageBillingOrderCommand {
    return new CancelVoteUsageBillingOrderCommand(
      params.billingOrderId,
      params.userPrincipalId,
      params.reason,
      params.canceledAt,
    );
  }
}
