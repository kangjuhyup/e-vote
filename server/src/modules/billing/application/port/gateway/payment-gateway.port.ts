export const PAYMENT_GATEWAY_PORT = Symbol('PAYMENT_GATEWAY_PORT');

export interface ProviderPayment {
  readonly paymentKey: string;
  readonly orderId: string;
  readonly totalAmount: number;
  readonly currency: string;
  readonly status: string;
  readonly approvedAt?: string;
}

export interface PaymentGatewayPort {
  confirm(input: {
    paymentKey: string;
    orderId: string;
    amount: number;
  }): Promise<ProviderPayment>;
  get(paymentKey: string): Promise<ProviderPayment>;
  cancel(input: {
    paymentKey: string;
    reason: string;
    idempotencyKey: string;
  }): Promise<ProviderPayment>;
}
