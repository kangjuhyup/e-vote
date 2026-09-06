import { AlertTriangle, CreditCard, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BillingOrder } from "@/features/billing/model/billing.types";

import {
  billingStatusLabels,
  formatBillingAmount,
} from "../lib/billing-view-models";

interface BillingOrderConfirmationProps {
  blockingReasons?: string[];
  errorMessage?: string;
  hasCommission: boolean;
  isConfirmed: boolean;
  isSubmitting: boolean;
  onConfirmChange: (confirmed: boolean) => void;
  onCreateOrder: () => void;
  order?: BillingOrder;
}

export function BillingOrderConfirmation({
  blockingReasons = [],
  errorMessage,
  hasCommission,
  isConfirmed,
  isSubmitting,
  onConfirmChange,
  onCreateOrder,
  order,
}: BillingOrderConfirmationProps) {
  const canCreateOrder = hasCommission && blockingReasons.length === 0;
  const canCreateReplacementOrder =
    order?.status === "CANCELED" || order?.status === "REFUNDED";
  const showOrder = order && !canCreateReplacementOrder;

  return (
    <Card className="mt-5 rounded-lg border-primary/20 shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CreditCard className="size-5 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">투표 이용료 결제 주문</CardTitle>
          {order ? (
            <Badge variant="outline">{billingStatusLabels[order.status]}</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
        {showOrder ? (
          <div className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-3">
              <Summary label="주문 금액" value={formatBillingAmount(order.amount, order.currency)} />
              <Summary label="선거인 수" value={`${order.electorCount.toLocaleString()}명`} />
              <Summary label="가격 구간" value={`${order.pricingUnitCount.toLocaleString()}구간`} />
            </dl>
            <p className="text-sm leading-6 text-muted-foreground">
              {order.status === "PENDING_PAYMENT"
                ? "결제 처리 중입니다. 완료될 때까지 투표는 초안으로 표시되지만 설정은 잠깁니다."
                : order.status === "REFUND_PENDING"
                  ? "환불 처리 중입니다. 환불이 완료될 때까지 투표의 확정 상태와 설정 잠금이 유지됩니다."
                  : "결제가 완료되어 투표가 확정됐습니다. 아직 투표를 개시하기 전 상태입니다."}
            </p>
            <Button asChild>
              <Link href={`/billing/vote-usage-orders/${order.id}`}>
                결제 주문 상세
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {order ? (
              <p className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                이전 주문은 {billingStatusLabels[order.status]} 상태입니다. 투표가 다시 초안으로 전환되어 설정을 수정하거나 새 결제를 요청할 수 있습니다.
              </p>
            ) : null}
            <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">주문 생성과 동시에 결제 처리가 시작됩니다.</p>
                <p className="mt-1 leading-6">
                  주문이 결제 대기 중인 동안에도 투표 설정, 선거인, 연결된 선거인명부 스냅샷은 잠깁니다. 결제가 완료되면 투표가 확정됩니다.
                </p>
              </div>
            </div>
            {blockingReasons.length > 0 ? (
              <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
                <p className="font-medium">확정 전에 필요한 설정</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  {blockingReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : !hasCommission ? (
              <p className="text-sm text-destructive">
                투표를 확정하려면 이 투표를 운영할 선거관리위원회를 먼저 지정해야 합니다.
              </p>
            ) : null}
            <p className="text-sm leading-6 text-muted-foreground">
              결제 주문 생성 권한은 선거관리위원회 소속이 아니라 현재 로그인한 사용자가 투표를 생성했는지를 기준으로 확인합니다.
            </p>
            {canCreateOrder ? (
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border"
                  checked={isConfirmed}
                  onChange={(event) => onConfirmChange(event.target.checked)}
                />
                <span>결제가 완료되거나 주문 취소·환불이 끝날 때까지 투표 설정이 잠긴다는 내용을 확인했습니다.</span>
              </label>
            ) : null}
            <Button
              type="button"
              disabled={!canCreateOrder || !isConfirmed || isSubmitting}
              onClick={onCreateOrder}
            >
              <LockKeyhole aria-hidden="true" />
              {isSubmitting
                ? "주문 생성 중…"
                : canCreateReplacementOrder
                  ? "이용료 다시 결제"
                  : "이용료 결제 요청"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
