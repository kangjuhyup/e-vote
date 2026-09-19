"use client";

import type { BillingOrder } from "@/features/billing/model/billing.types";
import { TossTestCheckout } from "@/features/billing/ui/toss-test-checkout";

import { useTossTestCheckout } from "../hooks/use-toss-test-checkout";

export function TossTestCheckoutContainer({ order }: { order: BillingOrder }) {
  const checkout = useTossTestCheckout(order);
  return <TossTestCheckout {...checkout} />;
}
