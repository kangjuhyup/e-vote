"use client";

import { Button } from "@/components/ui/button";

interface TossTestCheckoutProps {
  error?: string;
  isConfigured: boolean;
  isSupportedCurrency: boolean;
  ready: boolean;
  submitting: boolean;
  requestPayment: () => Promise<void>;
}

export function TossTestCheckout({
  error,
  isConfigured,
  isSupportedCurrency,
  ready,
  submitting,
  requestPayment,
}: TossTestCheckoutProps) {
  if (!isConfigured) {
    return <p role="alert">테스트 결제 설정이 필요합니다.</p>;
  }
  if (!isSupportedCurrency) {
    return <p role="alert">현재 통화는 테스트 결제를 지원하지 않습니다.</p>;
  }

  return (
    <section className="space-y-3 rounded-lg border p-4" aria-label="테스트 결제">
      <h2 className="font-medium">토스페이먼츠 테스트 결제</h2>
      <p className="text-sm text-muted-foreground">
        테스트 키로 진행되어 실제 금액이 청구되지 않습니다.
      </p>
      <div id="toss-payment-method" />
      <div id="toss-agreement" />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        disabled={!ready || submitting}
        onClick={() => void requestPayment()}
      >
        {submitting ? "결제창으로 이동 중…" : "카드 테스트 결제하기"}
      </Button>
    </section>
  );
}
