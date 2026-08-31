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
  errorMessage?: string;
  hasCommission: boolean;
  isConfirmed: boolean;
  isSubmitting: boolean;
  onConfirmChange: (confirmed: boolean) => void;
  onCreateOrder: () => void;
  order?: BillingOrder;
}

export function BillingOrderConfirmation({
  errorMessage,
  hasCommission,
  isConfirmed,
  isSubmitting,
  onConfirmChange,
  onCreateOrder,
  order,
}: BillingOrderConfirmationProps) {
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
        {order ? (
          <div className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-3">
              <Summary label="주문 금액" value={formatBillingAmount(order.amount, order.currency)} />
              <Summary label="선거인 수" value={`${order.electorCount.toLocaleString()}명`} />
              <Summary label="가격 구간" value={`${order.pricingUnitCount.toLocaleString()}구간`} />
            </dl>
            <p className="text-sm leading-6 text-muted-foreground">
              금액과 가격 기준은 서버가 주문 생성 시점에 확정한 값입니다. 결제 완료 처리는 외부 Payment 서비스의 승인 결과로만 반영됩니다.
            </p>
            <Button asChild>
              <Link href={`/billing/vote-usage-orders/${order.id}`}>
                결제 주문 상세
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">주문 생성과 동시에 투표 설정이 확정됩니다.</p>
                <p className="mt-1 leading-6">
                  이후 투표 설정, 선거인, 연결된 선거인명부 스냅샷을 변경할 수 없습니다. 금액은 서버가 유효 선거인 수를 기준으로 계산합니다.
                </p>
              </div>
            </div>
            {!hasCommission ? (
              <p className="text-sm text-destructive">
                이용료 주문을 생성하려면 활성 위원으로 등록된 선거관리위원회를 투표에 지정해야 합니다.
              </p>
            ) : (
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border"
                  checked={isConfirmed}
                  onChange={(event) => onConfirmChange(event.target.checked)}
                />
                <span>주문 생성 후 투표 설정이 잠기며, 변경하려면 취소 후 새 투표를 만들어야 함을 확인했습니다.</span>
              </label>
            )}
            <Button
              type="button"
              disabled={!hasCommission || !isConfirmed || isSubmitting}
              onClick={onCreateOrder}
            >
              <LockKeyhole aria-hidden="true" />
              {isSubmitting ? "주문 생성 중…" : "이용료 주문 생성 및 투표 확정"}
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
