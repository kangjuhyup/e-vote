# Vote Billing Read Contract Implementation Plan

> **For agentic workers:** Repository policy keeps this implementation inline; do not invoke additional Superpowers execution skills unless the user explicitly requests them. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose an owner-scoped active billing lifecycle on vote list/detail reads and repair the collided migration history without resetting any database.

**Architecture:** The vote query path remains a read-model composition boundary. It passes the authenticated principal into the repository and bulk-loads only billing orders owned by that principal, so list reads use one extra query rather than N queries. A later idempotent reconciliation migration guarantees both the billing finalization schema and the participation invitation schema regardless of which collided migration was recorded first.

**Tech Stack:** NestJS 11, MikroORM 7.1.11, PostgreSQL 16, Jest/Supertest, Swagger.

**Spec:** User request in this session (2026-09-05).

## Global Constraints

- Do not modify the UI worktree or restart running UI/server/auth processes.
- Preserve existing changes and do not print secrets, tokens, credentials, or personal data.
- Do not commit, push, open a PR, or merge to master.
- Keep billing creation authorized by vote creator and billing reads/cancellation authorized by order owner.
- Avoid N+1 queries on vote pages.
- Do not delete or reset the local database.

---

### Task 1: Principal-aware vote billing read model

**Files:**

- Modify: `server/src/modules/vote/application/query/dto/request/get-vote.query.ts`
- Modify: `server/src/modules/vote/application/query/dto/request/get-vote-page.query.ts`
- Modify: `server/src/modules/vote/application/query/dto/response/vote.view.ts`
- Modify: `server/src/modules/vote/application/port/persistence/query/vote-read-repository.port.ts`
- Modify: `server/src/modules/vote/application/query/handler/get-vote.handler.ts`
- Modify: `server/src/modules/vote/application/query/handler/get-vote-page.handler.ts`
- Modify: `server/src/modules/vote/infrastructure/database/repository/query/vote-read-repository.adapter.ts`
- Modify: `server/src/modules/vote/presentation/vote/vote-read.controller.ts`
- Modify: `server/src/modules/vote/presentation/vote/dto/get-vote-response.dto.ts`

**Interfaces:**

- Consumes: authenticated `UserPrincipal.id`, `votes.billing_order_id`, `billing_orders.status`, and `billing_orders.ordered_by_user_principal_id`.
- Produces: optional `activeBillingOrderId` and `billingOrderStatus` on both `VoteSummaryView` and `VoteView`.

- [ ] Add failing query/controller/repository tests for principal propagation, lifecycle mapping, owner filtering, and one bulk billing query per page.
- [ ] Run those tests and confirm the missing contract fails.
- [ ] Add principal IDs to vote GET query objects and repository requests.
- [ ] Bulk-load active orders for the page/detail, filtering by `orderedByUserPrincipalId`, and map only `PENDING_PAYMENT`, `PAID`, or `REFUND_PENDING`.
- [ ] Add optional Swagger response properties and document that terminal `CANCELED`/`REFUNDED` orders are history, so active fields are omitted.
- [ ] Re-run focused tests.

### Task 2: PostgreSQL lifecycle and access regression

**Files:**

- Modify: `server/test/collection-request-context.database.e2e-spec.ts`

**Interfaces:**

- Consumes: existing real PostgreSQL billing lifecycle fixture and mock outbox worker.
- Produces: HTTP assertions for detail and page reads at pending, paid, refund-pending, refunded, replacement-pending, plus a non-owner omission assertion.

- [ ] Extend the authenticated principal fixture to support a different user without exposing credentials.
- [ ] Assert both detail and page billing fields across every lifecycle transition.
- [ ] Assert another user receives no order ID or billing status.
- [ ] Run the dedicated PostgreSQL E2E suite.

### Task 3: Collision-safe schema reconciliation

**Files:**

- Create: `server/src/platform/database/migration/Migration20260905020000.ts`
- Create: `server/test/infrastructure/database/migration/migration-identifier-reconciliation.spec.ts`
- Create: `server/test/migration-identifier-reconciliation.database.e2e-spec.ts`
- Modify: `server/test/jest-e2e.json` only if the existing test matcher cannot discover the new suite.

**Interfaces:**

- Consumes: ambiguous history row `Migration20260905010000` and either/both possible schemas.
- Produces: idempotent presence of `participation_invitations`, active billing uniqueness, `FINALIZED` vote constraint, and lifecycle data repair under a unique migration name.

- [ ] Add source-level tests requiring a unique reconciliation migration and non-destructive SQL.
- [ ] Add PostgreSQL scenarios representing “participation won collision” and “billing won collision”.
- [ ] Implement forward-only idempotent reconciliation SQL; do not rename/delete the already published migration.
- [ ] Verify both scenarios without database reset outside the dedicated migration test schema.
- [ ] Document the future participation branch integration rule: drop/rename its colliding migration file while retaining entity/application changes because reconciliation owns the schema.

### Task 4: Contract documentation and full verification

**Files:**

- Modify: `docs/api/billing.md`
- Modify: related test fixtures required by the typed contract.

**Interfaces:**

- Consumes: implemented read contract and reconciliation behavior.
- Produces: UI-facing API guidance and verification evidence.

- [ ] Document field visibility, lifecycle values, terminal omission, polling implications, and the no-N+1 query shape.
- [ ] Run focused unit tests, all server unit tests, relevant PostgreSQL E2E suites, lint, and build under Node 24.
- [ ] Inspect the final diff and working tree; report results without committing.
