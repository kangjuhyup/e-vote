import type { BillingOrder } from "@/features/billing/model/billing.types";

import { formatBillingAmount } from "../lib/billing-view-models";

interface BillingPriceBreakdownProps {
  order: BillingOrder;
}

export function BillingPriceBreakdown({
  order,
}: BillingPriceBreakdownProps) {
  return (
    <dl className="overflow-hidden rounded-lg border">
      <PriceRow
        description={`${order.electorCount.toLocaleString()}명 · ${order.pricingUnitSize.toLocaleString()}명 단위 ${order.pricingUnitCount.toLocaleString()}구간 · 구간당 ${formatBillingAmount(order.unitPrice, order.currency)}`}
        label="기본 이용료"
        value={formatBillingAmount(order.baseAmount, order.currency)}
      />
      <PriceRow
        description={`${order.blockchainStorageCount.toLocaleString()}건 × ${formatBillingAmount(order.blockchainStorageUnitPrice, order.currency)}`}
        label="블록체인 결과 저장 추가금"
        value={formatBillingAmount(
          order.blockchainStorageAmount,
          order.currency,
        )}
      />
      {order.identityVerificationRequired ? (
        <PriceRow
          description={`${order.pricingUnitCount.toLocaleString()}구간 × ${formatBillingAmount(order.identityVerificationUnitPrice, order.currency)}`}
          label="본인인증 필수"
          value={formatBillingAmount(
            order.identityVerificationAmount,
            order.currency,
          )}
        />
      ) : null}
      <div className="flex items-center justify-between gap-4 border-t bg-muted/40 px-4 py-4 sm:px-5">
        <dt className="font-semibold">최종 결제 금액</dt>
        <dd className="shrink-0 text-xl font-semibold tabular-nums">
          {formatBillingAmount(order.amount, order.currency)}
        </dd>
      </div>
    </dl>
  );
}

function PriceRow({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b px-4 py-4 last:border-b-0 sm:px-5">
      <div className="min-w-0">
        <dt className="font-medium">{label}</dt>
        <dd className="mt-1 text-sm leading-5 text-muted-foreground">
          {description}
        </dd>
      </div>
      <dd className="shrink-0 font-medium tabular-nums">{value}</dd>
    </div>
  );
}
