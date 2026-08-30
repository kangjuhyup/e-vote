# Election Commission Query API Implementation Plan

> **For agentic workers:** Follow the repository `AGENTS.md` policy. Execute inline in this session; do not invoke subagent execution skills unless the user explicitly requests them.

**Goal:** Add paginated election-commission lookup and election-commission detail lookup, including registered members in the detail response.

**Architecture:** Add a CQRS read model and query repository port in application, map MikroORM entities to those read models in infrastructure, and expose them through a dedicated NestJS read controller. Keep ORM entities out of application/presentation and mask member names at the HTTP response boundary.

**Tech Stack:** NestJS, TypeScript, MikroORM, Jest, Swagger

**Spec:** User request from 2026-08-30; follow the existing vote/elector query API conventions.

## Global Constraints

- `GET` routes delegate to query handlers.
- Query handlers read through a dedicated read-repository port, not aggregates.
- Page defaults are `page=1`, `pageSize=20`, with `pageSize<=100`.
- Missing detail lookup maps to HTTP 404.
- Election-commission member names use the existing response masking decorator.

---

### Task 1: Application read contract and handlers

**Files:**

- Create: `server/src/application/query/view/election-commission.view.ts`
- Create: `server/src/application/port/persistence/query/election-commission-read-repository.port.ts`
- Create: `server/src/application/query/get-election-commission.query.ts`
- Create: `server/src/application/query/get-election-commission-page.query.ts`
- Create: `server/src/application/query/handler/get-election-commission.handler.ts`
- Create: `server/src/application/query/handler/get-election-commission-page.handler.ts`
- Test: `server/test/application/query/handler/election-commission-query.handlers.spec.ts`

**Interfaces:**

- Produces: `ElectionCommissionReadRepositoryPort.findDetailById(commissionId)` and `findPage({ page, pageSize })`.
- Produces: `GetElectionCommissionHandler.execute(query)` and `GetElectionCommissionPageHandler.execute(query)`.

- [ ] Write handler tests for successful detail, missing detail, and normalized pagination.
- [ ] Run the focused handler test and confirm it fails because the query contract is absent.
- [ ] Add framework-free queries/views, repository port, handlers, and `ElectionCommissionNotFoundError`.
- [ ] Run the focused handler test and confirm it passes.

### Task 2: MikroORM read adapter and provider wiring

**Files:**

- Create: `server/src/infrastructure/database/repository/query/election-commission-read-repository.adapter.ts`
- Modify: `server/src/infrastructure/database/database-repository.providers.ts`
- Test: `server/test/infrastructure/database/repository/election-commission-read-repository.adapter.spec.ts`

**Interfaces:**

- Consumes: `ElectionCommissionReadRepositoryPort` and election-commission read views.
- Produces: explicit ORM-to-read-model mapping for commission summaries, details, and members.

- [ ] Write adapter tests with a mocked `EntityManager` for detail mapping, pagination metadata, ordering, and missing rows.
- [ ] Run the focused adapter test and confirm it fails because the adapter is absent.
- [ ] Implement `ElectionCommissionReadRepositoryAdapter` and register/export its port token.
- [ ] Run the focused adapter test and confirm it passes.

### Task 3: HTTP routes, DTOs, and application wiring

**Files:**

- Create: `server/src/presentation/route/election-commission/election-commission-read.controller.ts`
- Create: `server/src/presentation/route/election-commission/dto/get-election-commission-request.dto.ts`
- Create: `server/src/presentation/route/election-commission/dto/get-election-commission-page-request.dto.ts`
- Create: `server/src/presentation/route/election-commission/dto/get-election-commission-response.dto.ts`
- Create: `server/src/presentation/route/election-commission/dto/get-election-commission-page-response.dto.ts`
- Modify: `server/src/app.module.ts`
- Modify: `server/src/app.module.spec.ts`
- Test: `server/test/presentation/route/election-commission/election-commission-read.controller.spec.ts`

**Interfaces:**

- Consumes: both election-commission query handlers.
- Produces: `GET /election-commissions` and `GET /election-commissions/:commissionId`.

- [ ] Write controller tests for page mapping, detail mapping, 404 mapping, ISO timestamps, and nested member mapping.
- [ ] Run the focused controller/module tests and confirm they fail before route wiring exists.
- [ ] Add validated request DTOs, Swagger response DTOs, controller routes, masking on member names, and module registrations.
- [ ] Run focused tests, then lint, type-check/build, and the full server test suite.
