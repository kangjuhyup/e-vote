# Vote Billing Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Authorize vote-usage billing by the authenticated vote creator, independently of election-commission membership.

**Architecture:** Persist `createdByUserPrincipalId` on new votes and expose it through the authoritative `VoteAccessPort`. Order creation checks that value; order read and cancellation use the immutable `orderedByUserPrincipalId` already stored on the order. Legacy votes keep a nullable creator and are denied until ownership is assigned from verified external evidence.

**Tech Stack:** NestJS 11, TypeScript, MikroORM 7, PostgreSQL, Jest.

**Spec:** User request dated 2026-09-05 in this worktree conversation.

## Global Constraints

- Work only in the server worktree; do not modify UI files.
- Preserve all existing billing/outbox uncommitted changes.
- Do not infer legacy ownership from commission membership.
- Do not commit, merge, push, or create a PR.

---

### Task 1: Capture and persist vote creator ownership

**Files:**
- Modify: `server/src/modules/vote/presentation/vote/vote.controller.ts`
- Modify: `server/src/modules/vote/application/command/dto/request/create-vote.command.ts`
- Modify: `server/src/modules/vote/application/command/handler/create-vote.handler.ts`
- Modify: `server/src/modules/vote/domain/vote/vote.aggregate.ts`
- Modify: `server/src/shared/domain/voting/capability-reference.ts`
- Modify: `server/src/modules/vote/infrastructure/database/entity/vote.entities.ts`
- Modify: `server/src/modules/vote/infrastructure/database/mapper/vote.mapper.ts`
- Modify: `server/src/modules/vote/infrastructure/database/repository/command/vote-repository.adapter.ts`
- Test: `server/test/application/command/handler/create-vote.handler.spec.ts`
- Test: `server/test/presentation/route/vote/vote.controller.spec.ts`
- Test: `server/test/infrastructure/database/mapper/database-mappers.spec.ts`
- Test: `server/test/infrastructure/database/repository/database-repository-adapters.spec.ts`

**Interfaces:**
- Produces: `VoteReference.createdByUserPrincipalId: string | undefined`.
- Produces: new `VoteAggregate.create` calls require a non-empty creator; legacy `reconstitute` accepts an absent creator.

- [x] Add failing controller, handler, mapper, and repository expectations for creator propagation.
- [x] Pass `UserPrincipal.id` into `CreateVoteCommand` and `VoteAggregate.create`.
- [x] Persist and reconstitute `created_by_user_principal_id` without exposing it in public response DTOs.
- [x] Run focused vote creation and persistence tests.

### Task 2: Replace commission membership with ownership checks

**Files:**
- Modify: `server/src/modules/billing/application/command/handler/create-vote-usage-billing-order.handler.ts`
- Modify: `server/src/modules/billing/application/command/handler/cancel-vote-usage-billing-order.handler.ts`
- Modify: `server/src/modules/billing/application/query/handler/get-billing-order.handler.ts`
- Test: `server/test/application/command/handler/billing-command.handlers.spec.ts`
- Test: `server/test/application/query/handler/billing-query.handler.spec.ts`

**Interfaces:**
- Consumes: `VoteReference.createdByUserPrincipalId` for order creation.
- Consumes: `BillingOrderAggregate.orderedByUserPrincipalId` and `BillingOrderView.orderedByUserPrincipalId` for cancellation and read authorization.

- [x] Add failing allow/deny tests for the matching creator, a commission member who is not the creator, and a legacy vote without a creator.
- [x] Remove membership-port injection from the three billing handlers.
- [x] Check vote ownership for creation and order ownership for read/cancel.
- [x] Run focused billing command/query tests.

### Task 3: Add a fail-closed legacy migration and policy documentation

**Files:**
- Create: `server/src/platform/database/migration/Migration20260905000000.ts`
- Create: `server/test/infrastructure/database/migration/vote-creator-ownership-migration.spec.ts`
- Modify: `docs/api/billing.md`

**Interfaces:**
- Produces: nullable `votes.created_by_user_principal_id` for legacy compatibility.
- Policy: no automatic backfill; legacy null rows cannot create billing orders until an operator assigns a verified creator.

- [x] Add a migration regression test that requires a nullable column and forbids UPDATE/backfill SQL.
- [x] Add the nullable column and rollback SQL.
- [x] Document creator/order-owner authorization and the explicit legacy remediation policy.
- [x] Run migration tests.

### Task 4: Verify the integrated server worktree

**Files:**
- Verify only; no additional feature files.

**Interfaces:**
- Consumes all prior tasks.
- Produces verification evidence without committing the worktree.

- [x] Run focused ownership tests.
- [x] Run the full server Jest suite.
- [x] Run non-mutating ESLint and server build under the repository Node version.
- [x] Run a dedicated PostgreSQL/MikroORM migration and persistence regression test if the local test database is available.
- [x] Confirm UI paths are untouched and pre-existing billing/outbox changes remain present.

### Task 5: Move direct domain-state decisions out of handlers

**Scope:** Refactor only decisions owned by loaded domain models: vote/order ownership,
elector mutability, participation lifecycle, and aggregate relationship/status predicates.
Keep not-found/scope error translation, DTO shape checks, storage metadata validation, and
CQRS projection consistency in the application layer.

- [x] Encapsulate vote/order ownership checks in Vote, BillingOrder, and the billing read model.
- [x] Encapsulate the repeated vote elector-mutability checks in Vote.
- [x] Encapsulate participation lifecycle and selection predicates in Vote, VoteDetail,
      Candidate, and FieldVotingSession.
- [x] Replace direct child-resource lifecycle checks with aggregate methods without changing
      error semantics.
- [x] Extend domain and handler regression tests, then rerun full verification.
