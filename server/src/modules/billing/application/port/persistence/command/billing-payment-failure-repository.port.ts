export const BILLING_PAYMENT_FAILURE_REPOSITORY_PORT = Symbol(
  'BILLING_PAYMENT_FAILURE_REPOSITORY_PORT',
);

export interface BillingPaymentFailureRepositoryPort {
  record(input: {
    billingOrderId: string;
    failureCode: string;
    failureMessage?: string;
    reportedAt: Date;
  }): Promise<void>;
}
