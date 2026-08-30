# Domain Module Extraction Architecture Implementation Plan

> **For agentic workers:** Follow the repository `AGENTS.md` policy. Execute inline unless the user explicitly requests delegated execution.

**Goal:** Reorganize the server into independently extractable domain modules so a future service can be created from `modules/<domain>` plus `shared` and `platform` without copying unrelated modules.

**Architecture:** Business capabilities live in vertical modules containing `application`, `domain`, `infrastructure`, and `presentation`. Modules never import one another directly; cross-capability data is represented by stable contracts in `shared`, technical runtime facilities live in `platform`, and the application root composes the selected modules and persistence entity contributors.

**Tech Stack:** NestJS, TypeScript, MikroORM, Jest

**Spec:** User request from 2026-08-30: make future service extraction possible by taking only `shared`, `platform`, and `modules/<domain>`.

## Global Constraints

- Preserve public HTTP routes and response shapes.
- Preserve database tables, columns, constraints, and migration history.
- Preserve CQRS write/read separation and application DTO `private constructor` plus `static of()` construction.
- `modules/<domain>` must not import another `modules/<domain>`.
- `shared` must remain framework- and infrastructure-independent.
- `platform` must not contain business rules or import domain modules.
- The composition root may import every selected module and platform package.
- Keep external I/O outside database transaction scopes.

---

### Task 1: Establish extraction boundaries

**Files:**

- Create: `server/src/shared/{application,domain}/`
- Create: `server/src/platform/`
- Create: `server/src/modules/{election-commission,electoral-roll,vote,elector,participation,field-voting}/`
- Modify: `server/test/architecture/layer-boundary.spec.ts`

**Interfaces:**

- Produces an architecture test that rejects module-to-module imports and framework imports from shared/domain code.

- [x] Move reusable domain primitives to `shared/domain`.
- [x] Move transaction, health, storage, and pagination contracts to `shared/application`.
- [x] Add dependency-boundary tests before moving business modules.

### Task 2: Move business capabilities into vertical modules

**Files:**

- Move: election commission sources to `server/src/modules/election-commission/{application,domain,infrastructure,presentation}`
- Move: electoral roll sources to `server/src/modules/electoral-roll/{application,domain,infrastructure,presentation}`
- Move: vote, vote-detail, candidate, attachment sources to `server/src/modules/vote/{application,domain,infrastructure,presentation}`
- Move: elector sources to `server/src/modules/elector/{application,domain,infrastructure,presentation}`
- Move: participation/statistics sources to `server/src/modules/participation/{application,domain,infrastructure,presentation}`
- Move: field voting sources to `server/src/modules/field-voting/{application,domain,infrastructure,presentation}`

**Interfaces:**

- Preserves existing command, query, view, port, aggregate, adapter, controller, and transport DTO class names.

- [x] Move application requests, responses, handlers, ports, and errors by capability.
- [x] Move pure domain models by aggregate ownership.
- [x] Move repository adapters, mappers, and entity contributors beside their owning capability.
- [x] Move HTTP controllers and transport DTOs beside their owning capability.
- [x] Rewrite imports without adding module-to-module dependencies.

### Task 3: Decouple cross-capability workflows

**Files:**

- Create: stable snapshot/value contracts under `server/src/shared/domain/`
- Modify: participation and field-voting aggregates and their handlers
- Modify: cross-capability application ports and tests

**Interfaces:**

- Consumes IDs and immutable capability snapshots rather than foreign aggregate classes.
- Keeps orchestration in application handlers and invariants in the owning domain model.

- [x] Replace foreign aggregate parameters with immutable shared contracts.
- [x] Keep repository access behind local application ports.
- [x] Verify no `modules/*` source imports another module.

### Task 4: Extract the technical platform

**Files:**

- Move: database bootstrap, migration, transaction, Redis, storage, security, and logging code to `server/src/platform/`
- Create: composition-owned persistence provider and entity registries from module-owned adapters and contributors
- Modify: `server/src/app.module.ts`, `server/mikro-orm.config.ts`

**Interfaces:**

- Platform exports technical Nest modules and generic adapters.
- Each business module owns its handlers, controllers, adapters, and database entity contributors.
- The service-specific composition root assembles only the selected module sources, providers, and contributors.

- [x] Remove the central business repository provider registry from platform.
- [x] Keep database migrations and ORM factory utilities in platform.
- [x] Assemble application handlers, controllers, and module-owned adapters in the service composition root.
- [x] Keep module composition, capability bridges, and health defaults in the root application module.

### Task 5: Verify extraction readiness

**Files:**

- Modify: architecture and module tests
- Create: extraction convention tests as needed

**Interfaces:**

- Proves each module depends only on itself, `shared`, `platform`, and external packages.

- [x] Run DTO and architecture convention tests.
- [x] Run all domain, application, presentation, persistence, and module tests with Node from `.nvmrc`.
- [x] Run server build and ESLint.
- [x] Run `git diff --check` and inspect the final dependency graph.
- [x] Commit the plan separately from implementation.
