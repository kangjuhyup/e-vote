# Vote Payment Finalization Implementation Plan

> **For agentic workers:** Execute this plan task-by-task in the current server worktree. Do not commit, merge, push, or modify the UI worktree without an explicit follow-up instruction.

**Goal:** Make a successfully paid vote explicitly `FINALIZED`, preserve the order-time setup lock, and release the vote for editing and repurchase only after cancellation or refund reaches a terminal state.

**Architecture:** Billing handlers coordinate the BillingOrder and Vote aggregates in one serializable database transaction through `VoteSetupLifecyclePort`. Vote owns setup-lock, finalization, opening, and release invariants; BillingOrder owns payment/refund state. PostgreSQL keeps historical orders and enforces at most one non-terminal order per vote with a partial unique index.

**Tech Stack:** NestJS 11, MikroORM 7, PostgreSQL, Jest

**Spec:** User request from 2026-09-05 for paid-vote finalization and refund/reorder consistency.

## Global Constraints

- Preserve existing uncommitted server changes.
- Do not stop or restart running UI/server/auth processes.
- Do not modify the UI worktree.
- Do not commit, merge, push, or open a PR.
- Reproduce with a newly created vote whose creator principal is present.
- Preserve billing ownership, outbox, and idempotency contracts.

---

### Task 1: Specify vote billing lifecycle invariants

**Files:**
- Modify: `server/src/shared/domain/voting/type/vote-status.type.ts`
- Modify: `server/src/modules/vote/domain/vote/vote.aggregate.ts`
- Test: `server/test/domain/vote/vote-domain.spec.ts`

**Interfaces:**
- Produces: `VoteStatus.Finalized`, `lockForBilling`, `finalizePaidBilling`, `assertBillingCancellationAllowed`, and `releaseBilling`.

- [x] Add failing domain tests for pending setup lock, paid finalization, open-from-finalized, refund-pending lock, terminal release, and idempotent replay.
- [x] Run the focused domain suite and confirm the new assertions fail.
- [x] Implement the minimal aggregate transitions and rerun the suite.

### Task 2: Coordinate payment and refund across aggregates

**Files:**
- Modify: `server/src/shared/application/port/capability/vote-billing.port.ts`
- Modify: `server/src/modules/vote/infrastructure/database/repository/command/vote-repository.adapter.ts`
- Modify: `server/src/modules/billing/application/command/handler/create-vote-usage-billing-order.handler.ts`
- Modify: `server/src/modules/billing/application/command/handler/mark-billing-order-paid.handler.ts`
- Modify: `server/src/modules/billing/application/command/handler/cancel-vote-usage-billing-order.handler.ts`
- Modify: `server/src/modules/billing/application/command/handler/mark-billing-order-refunded.handler.ts`
- Test: `server/test/application/command/handler/billing-command.handlers.spec.ts`

**Interfaces:**
- Consumes: Vote lifecycle operations from Task 1.
- Produces: atomic order/vote transitions with vote-first locking and replay-safe terminal handling.

- [x] Add failing handler tests for pending lock, paid finalization, pending cancellation release, refund-pending retention, refunded release, and repurchase.
- [x] Run the focused handler suite and confirm failures.
- [x] Wire the lifecycle port into payment/refund handlers and resolve the active order by vote while holding the parent vote lock.
- [x] Rerun the focused handler suite.

### Task 3: Retain historical orders and enforce one active order

**Files:**
- Modify: `server/src/modules/billing/application/port/persistence/command/billing-order-repository.port.ts`
- Modify: `server/src/modules/billing/infrastructure/database/repository/command/billing-order-repository.adapter.ts`
- Modify: `server/src/modules/billing/infrastructure/database/entity/billing.entities.ts`
- Create: `server/src/platform/database/migration/Migration20260905010000.ts`
- Test: `server/test/infrastructure/database/migration/billing-order-migration.spec.ts`
- Test: `server/test/infrastructure/database/repository/database-repository-adapters.spec.ts`

**Interfaces:**
- Produces: multiple terminal historical orders per vote, a partial unique active-order index, and paid-entitlement lookup that remains valid with history.

- [x] Add failing migration and repository contract tests.
- [x] Drop the global vote unique index, create the active-order partial unique index, and reconcile existing vote/order state without external side effects.
- [x] Update repository lookup behavior and rerun focused persistence tests.

### Task 4: Verify read contracts and real database flow

**Files:**
- Modify: `server/src/platform/database/entity/type/database-enum.type.ts`
- Modify: `server/test/collection-request-context.database.e2e-spec.ts`
- Modify: `docs/api/billing.md`

**Interfaces:**
- Consumes: `FINALIZED` database status and atomic lifecycle handlers.
- Produces: matching list/detail status and a documented pending/paid/refund contract.

- [x] Extend the real PostgreSQL E2E flow: creator-backed vote, pending order, paid vote `FINALIZED`, immutable setup, refund-pending lock, refunded `DRAFT`, and a new order.
- [x] Confirm list and detail APIs both expose `FINALIZED` after payment and `DRAFT` after refund.
- [x] Run focused domain/application/persistence/E2E tests.
- [x] Run the final full unit suite, lint, build, and `git diff --check` after review fixes.

### Task 5: Close replay and concurrent-write gaps

**Files:**
- Modify: billing payment replay handling and SMS entitlement checks.
- Modify: vote-detail, candidate, and attachment write handlers.
- Create: `server/test/billing-finalization-migration.database.e2e-spec.ts`.

- [x] Make matching payment-success replay a no-op through refund states without touching a replacement vote lock.
- [x] Reject upcoming-vote SMS while the order is `REFUND_PENDING`.
- [x] Serialize parent/child/attachment writes with billing issuance via the parent vote row lock.
- [x] Execute the migration against a dedicated PostgreSQL database and verify backfill/history/index behavior.
