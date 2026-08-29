# Server Directory Boundaries Implementation Plan

> **For agentic workers:** Execute this plan task-by-task in the current workspace. Do not overwrite unrelated worktree changes.

**Goal:** Align the vote server directory structure with application boundaries, CQRS read/write separation, and focused infrastructure/presentation responsibilities without changing runtime behavior.

**Architecture:** Application-owned transaction abstractions move out of infrastructure, while the MikroORM adapter remains infrastructure-owned. Database entities and repository adapters are grouped by responsibility, controllers are split by read/write/attachment concerns, and tests mirror the resulting source layout.

**Tech Stack:** TypeScript, NestJS 11, MikroORM 7, Jest/ts-jest, pnpm workspace

**Spec:** Conversation analysis accepted by the user on 2026-08-29.

## Global Constraints

- Preserve all existing API routes, DTOs, provider tokens, class behavior, and persistence mappings.
- Preserve unrelated dirty-worktree changes.
- Keep `presentation -> application -> domain` and `infrastructure -> application -> domain` dependency direction.
- Keep GET routes on query handlers and mutating routes on command handlers.
- Use lowercase kebab-case filenames and existing class suffix conventions.

---

### Task 1: Move transaction abstractions to the application boundary

**Files:**
- Create: `server/src/application/port/persistence/transaction/database-transaction-manager.port.ts`
- Create: `server/src/application/persistence/transaction/transactional.decorator.ts`
- Move: `server/src/infrastructure/database/transaction/mikro-orm-database-transaction-manager.adapter.ts`
- Modify: `server/src/infrastructure/database/database-transaction.providers.ts`
- Move tests to: `server/test/application/persistence/transaction/transactional.decorator.spec.ts` and `server/test/infrastructure/database/transaction/mikro-orm-database-transaction-manager.adapter.spec.ts`

- [ ] Move the framework-free port and decorator without changing their public symbols.
- [ ] Point the MikroORM adapter and Nest provider wiring at the application port.
- [ ] Update tests and all imports.
- [ ] Run the build and focused transaction tests.

### Task 2: Split the database entity registry by table group

**Files:**
- Create: `server/src/infrastructure/database/entity/entity-factory-context.ts`
- Create: `server/src/infrastructure/database/entity/election-commission.entities.ts`
- Create: `server/src/infrastructure/database/entity/vote.entities.ts`
- Create: `server/src/infrastructure/database/entity/elector.entities.ts`
- Create: `server/src/infrastructure/database/entity/participation.entities.ts`
- Create: `server/src/infrastructure/database/entity/attachment.entities.ts`
- Create: `server/src/infrastructure/database/entity/result.entities.ts`
- Replace: `server/src/infrastructure/database/entity/index.ts`

- [ ] Extract each unchanged MikroORM schema into the matching group factory.
- [ ] Resolve cross-group relations through a lazy entity registry so circular relations remain valid.
- [ ] Keep the exported `DatabaseEntityRegistry` and `createDatabaseEntityRegistry()` contract unchanged.
- [ ] Run build and database configuration/repository tests.

### Task 3: Separate command and query repository adapters

**Files:**
- Move write adapters to: `server/src/infrastructure/database/repository/command/`
- Move read adapters to: `server/src/infrastructure/database/repository/query/`
- Keep: `server/src/infrastructure/database/repository/database-repository.util.ts`
- Modify: `server/src/infrastructure/database/database-repository.providers.ts`
- Modify all moved adapter imports and repository tests.

- [ ] Move 11 authoritative write adapters into `command`.
- [ ] Move 5 read-model adapters into `query`.
- [ ] Update provider wiring and consumers while preserving tokens/classes.
- [ ] Run build and repository adapter tests.

### Task 4: Split large resource controllers by responsibility

**Files:**
- Create read and attachment controllers for `candidate`, `vote-detail`, and `vote` routes.
- Retain each existing `<resource>.controller.ts` for mutating resource creation.
- Modify: `server/src/app.module.ts`
- Split matching controller specs under `server/test/presentation/route/`.

- [ ] Move GET endpoints and query-handler dependencies into `<resource>-read.controller.ts`.
- [ ] Move attachment upload/confirm endpoints into `<resource>-attachment.controller.ts`.
- [ ] Keep routes, Swagger metadata, DTO mappings, and error mapping unchanged.
- [ ] Register every new controller in `AppModule` and update module/controller tests.
- [ ] Run build and controller tests.

### Task 5: Align remaining source and test locations

**Files:**
- Move: `server/src/domain/elector/elector-identity-verification.vo.ts` to `server/src/domain/elector/vo/elector-identity-verification.vo.ts`
- Move handler specs under `server/test/application/command/handler/` and `server/test/application/query/handler/`

- [ ] Update all VO imports.
- [ ] Move handler tests and adjust relative imports.
- [ ] Remove obsolete `.gitkeep` files from non-empty directories.
- [ ] Verify no stale source paths remain.

### Task 6: Final verification

- [ ] Run `npm run build` from `server`.
- [ ] Run `npm test -- --runInBand` from `server` and record any environment-level runner failure separately.
- [ ] Run `git diff --check`.
- [ ] Search for stale transaction, repository, controller, VO, handler-test, and view import paths.
