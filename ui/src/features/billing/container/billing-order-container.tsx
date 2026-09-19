"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";
import { VoteNavigation } from "@/features/votes/ui/vote-navigation";

import { BillingOrderManagement } from "../ui/billing-order-management";
import { TossTestCheckoutContainer } from "./toss-test-checkout-container";
import { useBillingOrderManagement } from "../hooks/use-billing-order-management";

interface BillingOrderContainerProps {
  account?: ReactNode;
  billingOrderId: string;
}

export function BillingOrderContainer({
  account,
  billingOrderId,
}: BillingOrderContainerProps) {
  const {
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
  } = useBillingOrderManagement(billingOrderId);

  return (
    <PageShell
      account={account}
      navigation={
        <VoteNavigation current="votes" isMockMode={isVoteApiMockMode()} />
      }
      eyebrow="결제 주문"
      title="투표 이용료 주문"
      description="서버가 확정한 이용료와 주문 상태, 취소·환불 조건을 확인합니다."
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
        <div className="space-y-5">
        {process.env.NEXT_PUBLIC_BILLING_PAYMENT_MODE === "toss-test" &&
        order.status === "PENDING_PAYMENT" && !isVoteApiMockMode() ? (
          <TossTestCheckoutContainer order={order} />
        ) : null}
        <BillingOrderManagement
          cancelConfirmed={cancelConfirmed}
          cancelReason={cancelReason}
          canCancel={canCancel}
          cancelUnavailableReason={cancelUnavailableReason}
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
        </div>
      ) : null}
    </PageShell>
  );
}
