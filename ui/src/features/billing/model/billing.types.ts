export type BillingOrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "CANCELED"
  | "REFUND_PENDING"
  | "REFUNDED";

export interface BillingOrder {
  amount: number;
  cancelableUntil: string;
  cancellationReason?: string;
  cancellationWindowDays: number;
  canceledAt?: string;
  commissionId?: string;
  currency: string;
  electorCount: number;
  id: string;
  issuedAt: string;
  orderedByUserPrincipalId?: string;
  paidAt?: string;
  paymentId?: string;
  pricingUnitCount: number;
  pricingUnitSize: number;
  productCode: string;
  productName: string;
  refundedAt?: string;
  refundRequestedAt?: string;
  status: BillingOrderStatus;
  unitPrice: number;
  voteId: string;
}

export interface CancelBillingOrderInput {
  billingOrderId: string;
  reason: string;
}

export function isBillingOrderCancelable(status: BillingOrderStatus) {
  return status === "PENDING_PAYMENT" || status === "PAID";
}
