import { AlertTriangle, CircleDollarSign, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { BillingOrder } from "@/features/billing/model/billing.types";
import { formatKoreanDateTime } from "@/shared/lib/date-format";

import {
  billingStatusLabels,
  formatBillingAmount,
} from "../lib/billing-view-models";

interface BillingOrderManagementProps {
  cancelConfirmed: boolean;
  cancelReason: string;
  canCancel: boolean;
  errorMessage?: string;
  isCancelling: boolean;
  message?: string;
  onCancel: () => void;
  onCancelConfirmedChange: (confirmed: boolean) => void;
  onCancelReasonChange: (reason: string) => void;
  order: BillingOrder;
}

export function BillingOrderManagement({
  cancelConfirmed,
  cancelReason,
  canCancel,
  errorMessage,
  isCancelling,
  message,
  onCancel,
  onCancelConfirmedChange,
  onCancelReasonChange,
  order,
}: BillingOrderManagementProps) {
  return (
    <div className="space-y-5">
      {errorMessage ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">
          {message}
        </p>
      ) : null}
      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="size-5 text-muted-foreground" aria-hidden="true" />
              <CardTitle>{order.productName}</CardTitle>
            </div>
            <Badge variant={order.status === "PAID" ? "default" : "outline"}>
              {billingStatusLabels[order.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">주문 금액</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {formatBillingAmount(order.amount, order.currency)}
            </p>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="선거인 수" value={`${order.electorCount.toLocaleString()}명`} />
            <Summary label="가격 단위" value={`${order.pricingUnitSize.toLocaleString()}명`} />
            <Summary label="가격 구간" value={`${order.pricingUnitCount.toLocaleString()}구간`} />
            <Summary label="구간당 금액" value={formatBillingAmount(order.unitPrice, order.currency)} />
            <Summary label="주문 시각" value={formatKoreanDateTime(order.issuedAt)} />
            <Summary label="취소 가능 기한" value={formatKoreanDateTime(order.cancelableUntil)} />
            <Summary label="상품 코드" value={order.productCode} />
          </dl>
          <p className="text-sm leading-6 text-muted-foreground">
            위 금액과 산정 기준은 서버가 주문 생성 시점에 저장한 스냅샷입니다. 이 화면에서는 금액을 수정하거나 결제 완료 상태로 변경할 수 없습니다.
          </p>
          <Button variant="outline" asChild>
            <Link href={`/votes/${order.voteId}`}>연결된 투표 보기</Link>
          </Button>
        </CardContent>
      </Card>

      {order.cancellationReason ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-base">취소 및 환불 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Summary label="취소 사유" value={order.cancellationReason} />
              <Summary label="취소 시각" value={order.canceledAt ? formatKoreanDateTime(order.canceledAt) : "-"} />
              {order.refundRequestedAt ? (
                <Summary label="환불 요청 시각" value={formatKoreanDateTime(order.refundRequestedAt)} />
              ) : null}
              {order.refundedAt ? (
                <Summary label="환불 완료 시각" value={formatKoreanDateTime(order.refundedAt)} />
              ) : null}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {canCancel ? (
        <Card className="rounded-lg border-destructive/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <RotateCcw className="size-5 text-destructive" aria-hidden="true" />
              <CardTitle className="text-base">주문 및 투표 취소</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-md bg-destructive/8 p-4 text-sm">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
              <p className="leading-6">
                미결제 주문은 취소 즉시 투표 설정 잠금이 해제됩니다. 결제 완료 주문은 환불 처리 중 상태로 전환되며, 환불 완료 후 투표를 다시 수정하거나 결제할 수 있습니다.
              </p>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              취소 사유
              <Textarea
                value={cancelReason}
                onChange={(event) => onCancelReasonChange(event.target.value)}
                placeholder="예: 투표 일정 변경"
                disabled={isCancelling}
                required
              />
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border"
                checked={cancelConfirmed}
                disabled={isCancelling}
                onChange={(event) => onCancelConfirmedChange(event.target.checked)}
              />
              <span>결제된 주문은 환불 완료 전까지 투표의 확정 상태와 설정 잠금이 유지됨을 확인했습니다.</span>
            </label>
            <Button
              type="button"
              variant="destructive"
              disabled={
                isCancelling ||
                !cancelConfirmed ||
                cancelReason.trim().length === 0
              }
              onClick={onCancel}
            >
              {isCancelling ? "취소 처리 중…" : "주문 및 투표 취소"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-muted p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all font-medium">{value}</dd>
    </div>
  );
}
