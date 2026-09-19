"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { billingApi } from "@/features/billing/api/billing-api";
import { billingOrderQueryOptions } from "@/features/billing/api/billing-query-options";
import { getBillingCancellationAvailability } from "@/features/billing/lib/billing-cancellation";
import { isBillingOrderCancelable } from "@/features/billing/model/billing.types";
import { voteDetailQueryOptions } from "@/features/votes/api/votes-query-options";
import { voteSmsDispatchPageQueryOptions } from "@/features/votes/api/vote-sms-query-options";

export function useBillingOrderManagement(billingOrderId: string) {
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [message, setMessage] = useState<string>();
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const orderQuery = useQuery(billingOrderQueryOptions(billingOrderId));
  const order = orderQuery.data;
  const orderStatus = order?.status;
  const voteQuery = useQuery({
    ...voteDetailQueryOptions(order?.voteId ?? ""),
    enabled: Boolean(order && isBillingOrderCancelable(order.status)),
  });
  const noticeDispatchesQuery = useQuery({
    ...voteSmsDispatchPageQueryOptions(order?.voteId ?? "", 1, 100),
    enabled: order?.status === "PAID",
  });
  const hasUpcomingNoticeDispatch =
    noticeDispatchesQuery.data?.items.some(
      (dispatch) => dispatch.purpose === "UPCOMING_VOTE_NOTICE",
    ) ?? false;
  const { canCancel, cancelUnavailableReason } =
    getBillingCancellationAvailability({
      status: orderStatus,
      startsAt: voteQuery.data?.startsAt,
      hasUpcomingNoticeDispatch,
      now: currentTime,
    });

  const cancelMutation = useMutation({
    mutationFn: billingApi.cancelVoteUsageOrder,
    onSuccess: async (updatedOrder) => {
      queryClient.setQueryData(
        billingOrderQueryOptions(billingOrderId).queryKey,
        updatedOrder,
      );
      setCancelReason("");
      setCancelConfirmed(false);
      setMessage(
        updatedOrder.status === "REFUND_PENDING"
          ? "취소 요청을 접수했습니다. 결제 금액은 환불 처리 중입니다."
          : "결제 주문을 취소하고 투표 상태 갱신을 요청했습니다.",
      );
      await queryClient.invalidateQueries({ queryKey: ["votes"] });
    },
  });

  useEffect(() => {
    if (!orderStatus) return;
    void queryClient.invalidateQueries({ queryKey: ["votes"] });
  }, [orderStatus, queryClient]);

  useEffect(() => {
    const startsAt = voteQuery.data?.startsAt;
    if (!startsAt) return;
    const delay = Date.parse(startsAt) - currentTime;
    if (delay <= 0) return;
    const timer = window.setTimeout(
      () => setCurrentTime(Date.now()),
      Math.min(delay, 60_000),
    );
    return () => window.clearTimeout(timer);
  }, [voteQuery.data?.startsAt, currentTime]);

  function handleCancel() {
    const reason = cancelReason.trim();
    setMessage(undefined);
    if (reason.length === 0) {
      setMessage("취소 사유를 입력해 주세요.");
      return;
    }
    if (!cancelConfirmed) {
      setMessage("취소·환불 처리 중의 투표 잠금 내용을 확인해 주세요.");
      return;
    }
    cancelMutation.mutate({ billingOrderId, reason });
  }

  return {
    order,
    orderQuery,
    cancelReason,
    setCancelReason,
    cancelConfirmed,
    setCancelConfirmed,
    message,
    canCancel,
    cancelUnavailableReason,
    cancelMutation,
    handleCancel,
  };
}
