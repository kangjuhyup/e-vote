import {
  isBillingOrderCancelable,
  type BillingOrderStatus,
} from "@/features/billing/model/billing.types";

export function getBillingCancellationAvailability({
  status,
  startsAt,
  hasUpcomingNoticeDispatch,
  now,
}: {
  status?: BillingOrderStatus;
  startsAt?: string;
  hasUpcomingNoticeDispatch: boolean;
  now: number;
}) {
  const voteStartPassed = startsAt
    ? Date.parse(startsAt) <= now
    : false;

  return {
    canCancel: Boolean(
      status &&
        isBillingOrderCancelable(status) &&
        !voteStartPassed &&
        !hasUpcomingNoticeDispatch,
    ),
    cancelUnavailableReason: voteStartPassed
      ? "투표 시작 시각이 지나 주문을 취소하거나 환불할 수 없습니다."
      : hasUpcomingNoticeDispatch
        ? "투표 안내 문자 발송이 시작되어 환불할 수 없습니다."
        : undefined,
  };
}
