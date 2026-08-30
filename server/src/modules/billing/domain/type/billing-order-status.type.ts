export const BillingOrderStatus = {
  PendingPayment: 'PENDING_PAYMENT',
  Paid: 'PAID',
  Refunded: 'REFUNDED',
} as const;

export type BillingOrderStatus =
  (typeof BillingOrderStatus)[keyof typeof BillingOrderStatus];
