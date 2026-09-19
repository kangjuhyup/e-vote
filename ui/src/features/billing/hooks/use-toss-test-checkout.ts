"use client";

import {
  loadTossPayments,
  type WidgetPaymentMethodWidget,
  type TossPaymentsWidgets,
} from "@tosspayments/tosspayments-sdk";
import { useEffect, useState } from "react";

import type { BillingOrder } from "@/features/billing/model/billing.types";

export function useTossTestCheckout(order: BillingOrder) {
  const [widgets, setWidgets] = useState<TossPaymentsWidgets>();
  const [methodWidget, setMethodWidget] =
    useState<WidgetPaymentMethodWidget>();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  const isConfigured = Boolean(clientKey?.startsWith("test_gck_"));
  const isSupportedCurrency = order.currency === "KRW";

  useEffect(() => {
    if (!isConfigured || !isSupportedCurrency || !clientKey) return;
    let canceled = false;
    let paymentWidget:
      | Awaited<ReturnType<TossPaymentsWidgets["renderPaymentMethods"]>>
      | undefined;
    let agreementWidget:
      | Awaited<ReturnType<TossPaymentsWidgets["renderAgreement"]>>
      | undefined;

    async function render() {
      try {
        const toss = await loadTossPayments(clientKey!);
        if (canceled) return;
        const instance = toss.widgets({ customerKey: order.id });
        await instance.setAmount({ currency: "KRW", value: order.amount });
        if (canceled) return;
        paymentWidget = await instance.renderPaymentMethods({
          selector: "#toss-payment-method",
        });
        if (canceled) {
          await paymentWidget.destroy();
          return;
        }
        agreementWidget = await instance.renderAgreement({
          selector: "#toss-agreement",
        });
        if (canceled) {
          await agreementWidget.destroy();
          await paymentWidget.destroy();
          return;
        }
        setWidgets(instance);
        setMethodWidget(paymentWidget);
      } catch {
        if (!canceled) {
          setError("결제 화면을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
      }
    }
    void render();
    return () => {
      canceled = true;
      void agreementWidget?.destroy();
      void paymentWidget?.destroy();
    };
  }, [clientKey, isConfigured, isSupportedCurrency, order.id, order.amount]);

  async function requestPayment() {
    if (!widgets || !methodWidget) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const selected = await methodWidget.getSelectedPaymentMethod();
      if (selected.code !== "CARD") {
        setError("테스트 결제는 카드 결제수단만 지원합니다.");
        setSubmitting(false);
        return;
      }
      await widgets.requestPayment({
        orderId: order.id,
        orderName: order.productName,
        successUrl: `${window.location.origin}/billing/vote-usage-orders/${order.id}/success`,
        failUrl: `${window.location.origin}/billing/vote-usage-orders/${order.id}/fail`,
      });
    } catch {
      setError("결제를 진행하지 못했습니다. 결제수단과 약관 동의를 확인해 주세요.");
      setSubmitting(false);
    }
  }

  return {
    error,
    isConfigured,
    isSupportedCurrency,
    ready: Boolean(widgets && methodWidget),
    submitting,
    requestPayment,
  };
}
