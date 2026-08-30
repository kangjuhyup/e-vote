export class MarkBillingOrderPaidCommand {
  private constructor(
    readonly billingOrderId: string,
    readonly paymentId: string,
    readonly amount: number,
    readonly currency: string,
    readonly paidAt: Date,
  ) {}

  static of(params: {
    readonly billingOrderId: string;
    readonly paymentId: string;
    readonly amount: number;
    readonly currency: string;
    readonly paidAt: Date;
  }): MarkBillingOrderPaidCommand {
    return new MarkBillingOrderPaidCommand(
      params.billingOrderId,
      params.paymentId,
      params.amount,
      params.currency,
      params.paidAt,
    );
  }
}
