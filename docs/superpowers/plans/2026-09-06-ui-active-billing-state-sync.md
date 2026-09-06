# UI Active Billing State Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서버가 vote 목록·상세에 제공하는 활성 결제 주문 정보를 사용해 직접 진입과 새로고침에서도 결제 처리 상태와 설정 잠금을 정확히 복원한다.

**Architecture:** vote API DTO와 view model에 선택적 활성 결제 주문 정보를 유지하고, 투표 컨테이너가 그 값을 billing query의 입력으로 사용한다. 결제 polling은 활성 주문 하나당 기존 500ms query 하나만 사용하며 상태 전이 시 vote query를 무효화한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack React Query, Vitest, Testing Library

**Spec:** 사용자 요청 및 server commit `d111f1baa972484ef0a81e0c57f7b32f8d86b340`

## Global Constraints

- 기존 tracked/untracked 변경과 safety stash를 모두 보존한다.
- 실행 중인 UI/server/auth 프로세스를 종료하거나 재시작하지 않는다.
- 서버 워크트리와 서버 파일을 수정하지 않는다.
- `Migration20260905010000` participation migration을 복원하거나 다시 추가하지 않는다.
- commit, push, PR, master merge를 수행하지 않는다.
- 토큰, secret, DB 접속 정보를 출력하지 않는다.

---

### Task 1: Safe master synchronization

**Files:**
- Preserve: all current tracked and untracked workspace files
- Verify: `server/src/platform/database/migration/Migration20260905020000.ts`

**Interfaces:**
- Consumes: local master `5d05d4269a006feb1ed875f986c4963b11c4b4a8`
- Produces: UI branch containing server source `d111f1baa972484ef0a81e0c57f7b32f8d86b340`

- [ ] Record `git status`, HEAD, stash list, and active listeners.
- [ ] Create a new safety stash including untracked files without dropping older stashes.
- [ ] Merge local master with `git merge --no-edit master`.
- [ ] Restore the new safety stash while intentionally retaining master migration `Migration20260905020000`.
- [ ] Verify no unmerged paths and both requested commits are ancestors of HEAD.

### Task 2: Vote API contract mapping

**Files:**
- Modify: `ui/src/features/votes/model/vote.types.ts`
- Modify: `ui/src/features/votes/api/votes-api.ts`
- Test: `ui/test/features/votes/api/votes-api.test.ts`

**Interfaces:**
- Consumes: `activeBillingOrderId?: string`, `billingOrderStatus?: "PENDING_PAYMENT" | "PAID" | "REFUND_PENDING"`
- Produces: the same optional fields on `VoteSummary` and `VoteDetail`

- [ ] Add failing mapping tests for all three exposed statuses and omitted terminal fields.
- [ ] Run the focused API test and confirm the new assertions fail.
- [ ] Add DTO fields, model fields, and direct response mapping.
- [ ] Run the focused API test and confirm it passes.

### Task 3: Restored billing query and UI lifecycle

**Files:**
- Modify: `ui/src/features/votes/container/vote-detail-container.tsx`
- Modify: `ui/src/features/votes/container/vote-edit-container.tsx`
- Modify: `ui/src/features/votes/container/vote-setup-container.tsx`
- Modify: `ui/src/features/votes/lib/vote-finalization.ts`
- Modify: `ui/src/features/billing/api/billing-query-options.ts`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`
- Test: `ui/test/features/votes/lib/vote-finalization.test.ts`
- Test: `ui/test/features/billing/api/billing-query-options.test.ts`

**Interfaces:**
- Consumes: active order ID and status from vote response plus optional locally-created order
- Produces: one effective billing order ID/status, 500ms polling only for transitional states, and vote query invalidation on transition

- [ ] Add failing direct-entry tests for DRAFT+PENDING_PAYMENT lock and status copy.
- [ ] Add failing tests for FINALIZED+PAID and FINALIZED+REFUND_PENDING lock behavior.
- [ ] Implement effective order ID/status selection, preferring the freshly-created order while accepting server-restored state.
- [ ] Enable the billing query only when an active order ID is present and preserve the established query key.
- [ ] Invalidate list/detail vote queries when the billing order changes state without creating per-render requests.
- [ ] Run focused container, lifecycle, and query-option tests.

### Task 4: List presentation and regression verification

**Files:**
- Modify if required: `ui/src/features/votes/container/vote-list-container.tsx`
- Modify if required: `ui/src/features/votes/lib/vote-view-models.ts`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

**Interfaces:**
- Consumes: vote summary billing status
- Produces: `결제 처리 중` for DRAFT+PENDING_PAYMENT and `확정됨(개시 전)` for FINALIZED states

- [ ] Add a failing list rendering test for DRAFT+PENDING_PAYMENT.
- [ ] Map the composite server state to the list badge without adding billing-order fetches per row.
- [ ] Confirm terminal orders remain omitted and therefore render as editable DRAFT.
- [ ] Run the focused list test.

### Task 5: Full verification

**Files:**
- Verify: all UI source and tests changed above

**Interfaces:**
- Consumes: completed implementation
- Produces: fresh verification evidence and an explicit blocker report

- [ ] Run `pnpm --filter @vote/ui test -- --testTimeout=20000`.
- [ ] Run `pnpm --filter @vote/ui lint`.
- [ ] Run `pnpm --filter @vote/ui exec tsc --noEmit`.
- [ ] Run `pnpm --filter @vote/ui build`.
- [ ] Run `git diff --check` and verify no unmerged paths.
- [ ] Report HEAD, safety stash, changed files, test counts, and runtime limitations without restarting processes.
