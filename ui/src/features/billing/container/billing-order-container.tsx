"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { billingApi } from "@/features/billing/api/billing-api";
import { billingOrderQueryOptions } from "@/features/billing/api/billing-query-options";
import { isBillingOrderCancelable } from "@/features/billing/model/billing.types";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";
import { VoteNavigation } from "@/features/votes/ui/vote-navigation";

import { BillingOrderManagement } from "../ui/billing-order-management";

interface BillingOrderContainerProps {
  account?: ReactNode;
  billingOrderId: string;
}

export function BillingOrderContainer({
  account,
  billingOrderId,
}: BillingOrderContainerProps) {
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [message, setMessage] = useState<string>();
  const orderQuery = useQuery(billingOrderQueryOptions(billingOrderId));
  const cancelMutation = useMutation({
    mutationFn: billingApi.cancelVoteUsageOrder,
    onSuccess: async (order) => {
      queryClient.setQueryData(
        billingOrderQueryOptions(billingOrderId).queryKey,
        order,
      );
      setCancelReason("");
      setCancelConfirmed(false);
      setMessage(
        order.status === "REFUND_PENDING"
          ? "취소 요청을 접수했습니다. 결제 금액은 환불 처리 중입니다."
          : "결제 주문을 취소하고 투표 상태 갱신을 요청했습니다.",
      );
      await queryClient.invalidateQueries({ queryKey: ["votes"] });
    },
  });
  const order = orderQuery.data;
  const orderStatus = order?.status;
  const cancelableByStatus = order
    ? isBillingOrderCancelable(order.status)
    : false;

  useEffect(() => {
    if (!orderStatus) return;
    void queryClient.invalidateQueries({ queryKey: ["votes"] });
  }, [orderStatus, queryClient]);

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

  return (
    <PageShell
      account={account}
      navigation={
        <VoteNavigation current="votes" isMockMode={isVoteApiMockMode()} />
      }
      eyebrow="결제 주문"
      title="투표 이용료 주문"
      description="서버가 확정한 이용료와 주문 상태, 취소 가능 기간을 확인합니다."
      actions={
        <Button type="button" variant="outline" asChild>
          <Link href={order ? `/votes/${order.voteId}` : "/votes"}>
            <ArrowLeft aria-hidden="true" />
            {order ? "투표 상세" : "투표 목록"}
          </Link>
        </Button>
      }
    >
      {orderQuery.isLoading ? (
        <SkeletonCardGrid count={2} label="결제 주문을 불러오는 중…" />
      ) : orderQuery.isError ? (
        <RetryErrorCard
          title="결제 주문을 불러오지 못했습니다."
          description={
            orderQuery.error instanceof Error
              ? orderQuery.error.message
              : "잠시 후 다시 시도하세요."
          }
          onRetry={() => orderQuery.refetch()}
        />
      ) : order ? (
        <BillingOrderManagement
          cancelConfirmed={cancelConfirmed}
          cancelReason={cancelReason}
          canCancel={cancelableByStatus}
          errorMessage={
            cancelMutation.error instanceof Error
              ? cancelMutation.error.message
              : undefined
          }
          isCancelling={cancelMutation.isPending}
          message={message}
          onCancel={handleCancel}
          onCancelConfirmedChange={setCancelConfirmed}
          onCancelReasonChange={setCancelReason}
          order={order}
        />
      ) : null}
    </PageShell>
  );
}
