export class MarkBillingOrderRefundedCommand {
  private constructor(
    readonly billingOrderId: string,
    readonly refundedAt: Date,
  ) {}

  static of(params: {
    readonly billingOrderId: string;
    readonly refundedAt: Date;
  }): MarkBillingOrderRefundedCommand {
    return new MarkBillingOrderRefundedCommand(
      params.billingOrderId,
      params.refundedAt,
    );
  }
}
