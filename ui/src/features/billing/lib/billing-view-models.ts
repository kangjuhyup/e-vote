import type { BillingOrderStatus } from "../model/billing.types";

export const billingStatusLabels: Record<BillingOrderStatus, string> = {
  CANCELED: "취소 완료",
  PAID: "결제 완료",
  PENDING_PAYMENT: "결제 대기",
  REFUNDED: "환불 완료",
  REFUND_PENDING: "환불 처리 중",
};

export function formatBillingAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
