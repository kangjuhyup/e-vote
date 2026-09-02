# Electoral Roll–Commission Decoupling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove direct election-commission ownership from electoral rolls while preserving immutable vote snapshots and enforcing an independent principal-based access policy.

**Architecture:** Electoral-roll aggregates and snapshots contain only roll data. A persistence-only access-grant relation scopes command and query repositories by `UserPrincipal.id`; vote snapshot attachment checks that grant and leaves the vote's commission relation unchanged.

**Tech Stack:** NestJS, TypeScript, MikroORM, PostgreSQL, Jest

**Spec:** `docs/superpowers/specs/2026-09-02-electoral-roll-commission-decoupling.md`

## Global Constraints

- Preserve immutable snapshot contents and one snapshot per source revision.
- Do not infer roll access from election-commission membership after migration.
- Do not expose member identifiers in the page API.
- Application and domain code remain framework/ORM independent except existing Nest injection at handler boundaries.

---

### Task 1: Domain and application contracts

**Files:**
- Modify: `server/src/modules/electoral-roll/domain/electoral-roll.aggregate.ts`
- Modify: `server/src/modules/electoral-roll/domain/electoral-roll-snapshot.aggregate.ts`
- Modify: electoral-roll command/query DTOs, ports, handlers, and vote snapshot attachment handler
- Test: electoral-roll domain, command-handler, and query-handler specs

**Interfaces:**
- Produces: `ElectoralRollRepositoryPort.create(roll, userPrincipalId)` and principal-scoped lookup methods.
- Produces: `ElectoralRollSnapshotAccessPort.resolveCurrent(electoralRollId, userPrincipalId, createdAt)`.

- [ ] Remove `commissionId` from roll and snapshot aggregate construction/reconstitution tests and implementation.
- [ ] Add `userPrincipalId` to create/manage/query commands and scope repository calls with it.
- [ ] Resolve or create the current snapshot from an accessible source roll and remove the commission-equality check.
- [ ] Run focused domain/application tests and confirm unauthorized lookups resolve as not found.

### Task 2: PostgreSQL access grants and migration

**Files:**
- Modify: `server/src/modules/electoral-roll/infrastructure/database/entity/electoral-roll.entities.ts`
- Modify: electoral-roll command/read/snapshot repository adapters
- Modify: database entity registry types and registration
- Create: `server/src/platform/database/migration/Migration20260902000000.ts`
- Test: electoral-roll repository and migration specs

**Interfaces:**
- Consumes: principal-scoped repository contracts from Task 1.
- Produces: an access-grant row on create and access predicates for all reads/mutations.

- [ ] Define `ElectoralRollAccessGrantEntity` and register it.
- [ ] Persist the roll and creator grant in one unit of work.
- [ ] Filter roll detail/page and snapshot access through `accessGrants.userPrincipalId`.
- [ ] Backfill active linked principals, then remove both legacy commission foreign keys, indexes, and columns.
- [ ] Run adapter and migration tests.

### Task 3: HTTP contract and documentation

**Files:**
- Modify: electoral-roll controllers and presentation DTOs
- Modify: vote snapshot attachment controller/command mapping
- Modify: `docs/api/electoral-rolls.md`
- Test: electoral-roll and vote controller specs, application architecture spec

**Interfaces:**
- Consumes: authenticated `UserPrincipal.id` from the existing `@User()` decorator.
- Produces: commission-independent electoral-roll request/response payloads.

- [ ] Remove `commissionId` from create/list/detail HTTP contracts and Swagger metadata.
- [ ] Pass `UserPrincipal.id` to every roll mutation, detail, page, and snapshot attachment operation.
- [ ] Document explicit principal grants, the migration rule, and the `Vote -> snapshot -> roll` link.
- [ ] Run controller and architecture tests.

### Task 4: Regression verification

**Files:**
- Modify: impacted fixtures discovered by TypeScript/Jest failures only.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: buildable, lint-clean, test-covered change set.

- [ ] Run focused electoral-roll tests under the repository Node version selected by `nvm use`.
- [ ] Run the full unit suite, application E2E suite, build, lint, and `git diff --check`.
- [ ] Review the final diff for remaining electoral-roll `commissionId` references and document intentional vote-only references.
