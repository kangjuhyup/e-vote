'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/layout/page-shell';
import { billingApi } from '@/features/billing/api/billing-api';
import { billingOrderQueryOptions } from '@/features/billing/api/billing-query-options';

export function TossTestResultContainer({
  billingOrderId,
  paymentKey,
  orderId,
  amount,
  failureCode,
  failureMessage,
}: {
  billingOrderId: string;
  paymentKey?: string;
  orderId?: string;
  amount?: string;
  failureCode?: string;
  failureMessage?: string;
}) {
  const router = useRouter();
  const started = useRef(false);
  const failureReported = useRef(false);
  const [error, setError] = useState<string>();
  const isSuccess = !failureCode;
  const failedOrderQuery = useQuery({
    ...billingOrderQueryOptions(billingOrderId),
    enabled: !isSuccess,
    refetchInterval: false,
  });
  const failedOrder = failedOrderQuery.data;
  const canRetryPayment = Boolean(
    failureCode &&
      failedOrderQuery.isSuccess &&
      !failedOrderQuery.isFetching &&
      failedOrder?.status === 'PENDING_PAYMENT',
  );
  const canRequestNewOrder = Boolean(
    failureCode &&
      failedOrder?.voteId &&
      (failedOrder?.status === 'CANCELED' ||
        failedOrder?.status === 'REFUNDED'),
  );
  const nextHref = canRequestNewOrder && failedOrder
    ? `/votes/${failedOrder.voteId}/edit`
    : `/billing/vote-usage-orders/${billingOrderId}`;
  const numericAmount = Number(amount);
  const invalidResult =
    isSuccess &&
    (!paymentKey ||
      orderId !== billingOrderId ||
      !Number.isSafeInteger(numericAmount) ||
      numericAmount <= 0);

  useEffect(() => {
    if (!failureCode || failureReported.current || !/^[A-Z][A-Z0-9_]{0,63}$/.test(failureCode)) return;
    failureReported.current = true;
    void billingApi.reportPaymentFailure({ billingOrderId, failureCode, failureMessage: failureMessage?.slice(0, 200) }).catch(() => {
      // The return screen remains usable when audit reporting is unavailable.
    });
  }, [billingOrderId, failureCode, failureMessage]);

  useEffect(() => {
    if (
      !isSuccess ||
      invalidResult ||
      !paymentKey ||
      !orderId ||
      started.current
    )
      return;
    started.current = true;
    void billingApi
      .confirmTossTestPayment({
        billingOrderId,
        paymentKey,
        orderId,
        amount: numericAmount,
      })
      .then((order) => {
        if (order.status === 'PAID') {
          router.replace(`/billing/vote-usage-orders/${billingOrderId}`);
        } else {
          setError(
            '투표 시작 시각이 지나 결제 취소를 처리 중입니다. 주문 상태를 확인해 주세요.',
          );
        }
      })
      .catch(() => {
        setError(
          '결제 승인 결과를 확인하지 못했습니다. 주문 화면에서 상태를 확인하고, 계속 대기 중이면 이 페이지에서 다시 시도해 주세요.',
        );
      });
  }, [
    billingOrderId,
    invalidResult,
    isSuccess,
    numericAmount,
    orderId,
    paymentKey,
    router,
  ]);

  return (
    <PageShell
      eyebrow="결제 결과"
      title={
        isSuccess ? '결제를 확인하고 있습니다' : '결제가 완료되지 않았습니다'
      }
      description="주문 상태를 확인한 뒤 필요한 경우 결제를 다시 진행할 수 있습니다."
    >
      <div className="space-y-4 rounded-lg border p-6">
        {failureCode ? (
          <p role="alert">
            결제를 취소했거나 진행 중 오류가 발생했습니다. ({failureCode})
          </p>
        ) : error || invalidResult ? (
          <p role="alert">
            {error ??
              '결제 결과가 주문과 일치하지 않습니다. 다시 확인해 주세요.'}
          </p>
        ) : (
          <p role="status">잠시만 기다려 주세요.</p>
        )}
        {failureCode && failedOrderQuery.isLoading ? (
          <p role="status">재결제 가능 여부를 확인하고 있습니다.</p>
        ) : null}
        {failureCode && failedOrderQuery.isError ? (
          <p role="alert">
            주문 상태를 확인하지 못했습니다. 재결제 전에 주문 상태를 확인해 주세요.
          </p>
        ) : null}
        {canRetryPayment ? (
          <p role="status">결제 대기 중입니다. 이 주문에서 다시 결제할 수 있습니다.</p>
        ) : null}
        {failureCode && failedOrder?.status === 'PAID' ? (
          <p role="status">이 주문은 이미 결제 완료됐습니다. 다시 결제하지 않아도 됩니다.</p>
        ) : null}
        {canRequestNewOrder ? (
          <p role="status">
            이 주문은 다시 결제할 수 없습니다. 투표 설정에서 새 결제 가능 여부를 확인해 주세요.
          </p>
        ) : null}
        {failureCode && failedOrder?.status === 'REFUND_PENDING' ? (
          <p role="status">환불 처리 중입니다. 완료 전에는 다시 결제할 수 없습니다.</p>
        ) : null}
        <Button asChild variant={canRetryPayment ? 'default' : 'outline'}>
          <Link href={nextHref}>
            {canRetryPayment
              ? '다시 결제하러 가기'
              : canRequestNewOrder
                ? '투표 설정 확인'
                : failedOrder?.status === 'PAID'
                  ? '결제 내역 보기'
                  : '주문 상태 확인'}
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}
