export const BillingOrderStatus = {
  PendingPayment: 'PENDING_PAYMENT',
  Paid: 'PAID',
  Canceled: 'CANCELED',
  RefundPending: 'REFUND_PENDING',
  Refunded: 'REFUNDED',
} as const;

export type BillingOrderStatus =
  (typeof BillingOrderStatus)[keyof typeof BillingOrderStatus];
