# Vote Schedule Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically open paid finalized votes at `startedAt` and close open votes at `endedAt` from the standalone worker.

**Architecture:** Promote the existing persisted voting window into the `VoteAggregate`, expose it on create/update commands, and process due aggregates through a transactional application handler. A worker-only `@rvkang/batch-core` polling adapter invokes the handler; PostgreSQL `FOR UPDATE SKIP LOCKED` makes concurrent replicas safe.

**Tech Stack:** NestJS 11, MikroORM 7/PostgreSQL, `@rvkang/batch-core`, Jest.

**Spec:** `docs/superpowers/specs/2026-09-06-vote-schedule-worker.md`

## Global Constraints

- Preserve the API/worker process split and keep polling out of `AppModule`.
- Preserve existing UI worktree changes and running UI/API/auth processes.
- Do not print tokens, secrets, or database credentials.
- Do not commit, push, or merge without a separate user instruction.

---

### Task 1: Make the voting window an aggregate invariant

**Files:**
- Modify: `server/src/modules/vote/domain/vote/vote.aggregate.ts`
- Modify: `server/src/modules/vote/application/command/dto/request/create-vote.command.ts`
- Modify: `server/src/modules/vote/application/command/dto/request/update-vote.command.ts`
- Modify: `server/src/modules/vote/application/command/handler/create-vote.handler.ts`
- Modify: `server/src/modules/vote/application/command/handler/update-vote.handler.ts`
- Modify: `server/src/modules/vote/presentation/vote/dto/create-vote-request.dto.ts`
- Modify: `server/src/modules/vote/presentation/vote/dto/manage-vote-request.dto.ts`
- Modify: `server/src/modules/vote/presentation/vote/vote.controller.ts`
- Test: `server/test/domain/vote/vote-domain.spec.ts`
- Test: `server/test/application/command/handler/create-vote.handler.spec.ts`
- Test: `server/test/presentation/route/vote/vote.controller.spec.ts`

**Interfaces:**
- Consumes: existing `startedAt`/`endedAt` database and read-response fields.
- Produces: aggregate `startedAt`, `endedAt`, `openWhenDue(now)`, and schedule-aware create/update commands.

- [x] Add failing domain tests for invalid windows, opening before `startedAt`, due opening, and expired-window close.
- [x] Run the focused domain test and verify it fails for missing schedule behavior.
- [x] Add schedule state and boundary checks to `VoteAggregate`.
- [x] Add optional ISO date fields to create/update HTTP bodies and map them to application commands.
- [x] Preserve immediate-start compatibility when a create request omits both fields and preserve stored values on update omission.
- [x] Run the focused command/controller/domain tests and verify they pass.

### Task 2: Persist and lock due schedule work

**Files:**
- Create: `server/src/modules/vote/application/port/persistence/command/vote-schedule-repository.port.ts`
- Modify: `server/src/modules/vote/infrastructure/database/mapper/vote.mapper.ts`
- Modify: `server/src/modules/vote/infrastructure/database/repository/command/vote-repository.adapter.ts`
- Modify: `server/src/composition/database-repository.providers.ts`
- Create: `server/src/platform/database/migration/Migration20260906000000.ts`
- Test: `server/test/infrastructure/database/repository/database-repository-adapters.spec.ts`
- Create: `server/test/infrastructure/database/migration/vote-schedule-worker-migration.spec.ts`

**Interfaces:**
- Consumes: aggregate schedule state from Task 1.
- Produces: `VoteScheduleRepositoryPort.findDueForOpening()` and `findDueForClosing()` returning row-locked aggregates.

- [x] Add failing repository and migration tests for schedule round-trip, partial indexes, and due-row selection.
- [x] Run the focused persistence tests and verify they fail.
- [x] Map `startedAt`/`endedAt` through `VoteMapper` and `VoteRepositoryAdapter.save()`.
- [x] Implement due queries with transaction-bound PostgreSQL `FOR UPDATE SKIP LOCKED`.
- [x] Register/export the schedule repository token as an alias of `VOTE_REPOSITORY_PORT`.
- [x] Add partial due indexes for `FINALIZED` opening and `OPEN` closing scans.
- [x] Run the focused persistence/migration tests and verify they pass.

### Task 3: Process schedules transactionally

**Files:**
- Create: `server/src/modules/vote/application/command/dto/request/process-due-vote-schedules.command.ts`
- Create: `server/src/modules/vote/application/command/dto/response/process-due-vote-schedules-result.dto.ts`
- Create: `server/src/modules/vote/application/command/handler/process-due-vote-schedules.handler.ts`
- Create: `server/test/application/command/handler/process-due-vote-schedules.handler.spec.ts`

**Interfaces:**
- Consumes: schedule repository, `VOTE_USAGE_ENTITLEMENT_ACCESS_PORT`, and database transaction manager.
- Produces: an idempotent batch result containing opened and closed counts.

- [x] Add failing handler tests for future, unpaid, paid-due, expired, and replayed votes.
- [x] Run the focused handler tests and verify they fail.
- [x] Implement a short `READ COMMITTED` transaction that opens only paid due votes and closes due open votes.
- [x] Run the focused handler tests and verify they pass.

### Task 4: Poll schedules only from WorkerModule

**Files:**
- Create: `server/src/modules/vote/infrastructure/scheduling/vote-schedule.worker.ts`
- Modify: `server/src/worker.module.ts`
- Modify: `server/test/worker.module.spec.ts`
- Create: `server/test/infrastructure/scheduling/vote-schedule.worker.spec.ts`
- Modify: `server/test/app.module.spec.ts`

**Interfaces:**
- Consumes: `ProcessDueVoteSchedulesHandler`.
- Produces: worker-only continuous polling with `dispatchOnce(now)` for deterministic tests.

- [x] Add failing worker/module tests proving polling is registered in `WorkerModule` and absent from `AppModule`.
- [x] Run the focused worker tests and verify they fail.
- [x] Implement the `@rvkang/batch-core` polling lifecycle and register it only in `WorkerModule`.
- [x] Run the focused worker/module tests and verify they pass.

### Task 5: Verify PostgreSQL lifecycle and server quality gates

**Files:**
- Modify: `server/test/collection-request-context.database.e2e-spec.ts`
- Modify: `README.md`
- Modify: `docs/api/billing.md`

**Interfaces:**
- Consumes: all preceding tasks.
- Produces: documented API/worker contract and real PostgreSQL regression coverage.

- [x] Add a PostgreSQL E2E case for payment before start, time becoming due, automatic open, automatic close, and replay idempotency.
- [x] Run the targeted E2E and verify it passes without touching operational data.
- [x] Document schedule fields and worker ownership.
- [x] Run the complete server unit test suite, lint, build, migration test, and isolated real worker startup/shutdown.
- [x] Run `git diff --check` and inspect the final changed-file scope.
