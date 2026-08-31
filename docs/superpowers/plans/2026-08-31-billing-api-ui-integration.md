# Billing API UI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 최신 master의 투표 이용료 주문 생성·조회·취소 API를 투표 생성 검토 흐름과 주문 상세 화면에 안전하게 연결한다.

**Architecture:** `features/billing`이 결제 주문 API 계약, React Query 컨테이너, hookless 주문 UI를 소유한다. 투표 생성 컨테이너는 생성된 vote ID로 주문 생성만 호출하고 billing UI를 ReactNode로 합성한다. 반환된 주문 ID는 전용 App Router 경로로 전달하며, 조회와 취소는 해당 주문 상세 컨테이너에서 처리한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack React Query, Vitest, Testing Library

**Spec:** `docs/api/billing.md`

## Global Constraints

- 서버 코드는 변경하지 않는다.
- `.nvmrc`의 Node.js 24를 사용한다.
- 클라이언트는 금액, 통화, 선거인 수, 가격 단위를 계산하거나 요청에 포함하지 않는다.
- 주문 생성은 투표 확정이며 설정을 잠그므로 사용자가 설명을 읽고 명시적으로 실행해야 한다.
- 공개 HTTP 요청으로 주문을 `PAID`로 변경하는 기능을 만들지 않는다.
- 취소 사유는 공백 제거 후 비어 있으면 요청하지 않는다.

---

### Task 1: Billing API 계약

**Files:**
- Create: `ui/src/features/billing/model/billing.types.ts`
- Create: `ui/src/features/billing/api/billing-api.ts`
- Create: `ui/src/features/billing/api/billing-query-options.ts`
- Test: `ui/test/features/billing/api/billing-api.test.ts`

**Interfaces:**
- Produces: `billingApi.createVoteUsageOrder(voteId)`, `billingApi.fetchVoteUsageOrder(orderId)`, `billingApi.cancelVoteUsageOrder({ billingOrderId, reason })`.
- Produces: `billingOrderQueryOptions(billingOrderId)`.

- [ ] **Step 1: Test exact methods, paths and bodies**

```ts
await client.createVoteUsageOrder("vote/1");
expect(fetcher).toHaveBeenCalledWith(
  "https://api.example.com/billing/vote-usage-orders",
  expect.objectContaining({ method: "POST", body: JSON.stringify({ voteId: "vote/1" }) }),
);
```

- [ ] **Step 2: Implement live and mock clients**

```ts
export interface BillingOrder {
  id: string;
  voteId: string;
  amount: number;
  currency: "KRW" | string;
  status: "PENDING_PAYMENT" | "PAID" | "CANCELED" | "REFUND_PENDING" | "REFUNDED";
}
```

The mock client stores server-shaped order snapshots and never accepts client price data.

- [ ] **Step 3: Run the focused API test**

Run: `pnpm --filter @vote/ui test -- test/features/billing/api/billing-api.test.ts`
Expected: PASS.

### Task 2: 투표 생성 후 주문 확정

**Files:**
- Create: `ui/src/features/billing/ui/billing-order-confirmation.tsx`
- Modify: `ui/src/features/votes/container/vote-setup-container.tsx`
- Modify: `ui/src/features/votes/ui/vote-setup-wizard.tsx`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

**Interfaces:**
- Consumes: `billingApi.createVoteUsageOrder(voteId)`.
- Produces: a `billingPanel?: ReactNode` review slot and an order detail link.

- [ ] **Step 1: Test explicit confirmation behavior**

```ts
expect(screen.getByText(/주문 생성과 동시에 투표 설정이 확정/)).toBeTruthy();
fireEvent.click(screen.getByRole("button", { name: "이용료 주문 생성 및 투표 확정" }));
expect(await screen.findByRole("link", { name: "결제 주문 상세" })).toBeTruthy();
```

- [ ] **Step 2: Wire the mutation in the vote setup container**

```ts
const billingMutation = useMutation({
  mutationFn: billingApi.createVoteUsageOrder,
  onSuccess: setBillingOrder,
});
```

Pass a billing-owned UI panel into the review slot. The request body contains only `voteId`.

- [ ] **Step 3: Run the focused vote flow test**

Run: `pnpm --filter @vote/ui test -- test/features/votes/container/vote-pages.test.tsx`
Expected: PASS.

### Task 3: 주문 상세 조회와 취소

**Files:**
- Create: `ui/src/app/billing/vote-usage-orders/[billingOrderId]/page.tsx`
- Create: `ui/src/features/billing/container/billing-order-container.tsx`
- Create: `ui/src/features/billing/ui/billing-order-management.tsx`
- Test: `ui/test/features/billing/container/billing-order-container.test.tsx`

**Interfaces:**
- Consumes: Task 1 query options and cancellation mutation.
- Produces: `BillingOrderContainer({ billingOrderId, account })`.

- [ ] **Step 1: Test server snapshot display and cancellation**

```ts
expect(await screen.findByText("6,000원")).toBeTruthy();
fireEvent.change(screen.getByLabelText("취소 사유"), { target: { value: "투표 일정 변경" } });
fireEvent.click(screen.getByRole("button", { name: "주문 및 투표 취소" }));
expect(await screen.findByText("취소 완료")).toBeTruthy();
```

- [ ] **Step 2: Implement authenticated route, query and mutation**

```tsx
<BillingOrderManagement
  order={orderQuery.data}
  onCancel={(reason) => cancelMutation.mutate({ billingOrderId, reason })}
/>
```

Show only server-returned price snapshots. Show cancellation controls only for `PENDING_PAYMENT` and `PAID`; explain that `PAID` cancellation becomes `REFUND_PENDING`.

- [ ] **Step 3: Verify the UI workspace**

Run: `source "$NVM_DIR/nvm.sh" && nvm use && pnpm --filter @vote/ui test && pnpm --filter @vote/ui lint && pnpm --filter @vote/ui build`
Expected: all tests, lint, and production build pass.
